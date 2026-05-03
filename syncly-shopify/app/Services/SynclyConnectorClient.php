<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SynclyConnectorClient
{
    protected function baseUrl(): string
    {
        return rtrim((string) config('services.syncly.url', ''), '/');
    }

    protected function connectorPath(string $suffix): string
    {
        return 'api/connectors/shopify/' . ltrim($suffix, '/');
    }

    protected function postJson(string $path, array $body, ?string $bearer = null): array
    {
        $url = $this->baseUrl() . '/' . ltrim($path, '/');
        $req = Http::timeout(60)->acceptJson();
        if ($bearer) {
            $req = $req->withToken($bearer);
        }
        $res = $req->post($url, $body);
        if (!$res->successful()) {
            Log::warning('Syncly HTTP error', ['url' => $url, 'status' => $res->status(), 'body' => $res->body()]);
        }
        return $res->json() ?: ['success' => false, 'error' => 'Invalid JSON response'];
    }

    public function tokenExpired(User $user): bool
    {
        if (empty($user->syncly_access_expires_at)) {
            return false;
        }
        try {
            return Carbon::parse($user->syncly_access_expires_at)->lte(now()->addSeconds(30));
        } catch (\Throwable $e) {
            return true;
        }
    }

    public function refresh(User $user): bool
    {
        if (empty($user->syncly_store_id) || empty($user->syncly_refresh_token)) {
            return false;
        }
        $data = $this->postJson($this->connectorPath('auth/refresh'), [
            'store_id' => $user->syncly_store_id,
            'refresh_token' => $user->syncly_refresh_token,
        ]);
        if (!($data['success'] ?? false) || empty($data['data']['access_token'])) {
            Log::error('Syncly refresh failed', ['response' => $data]);
            return false;
        }
        $d = $data['data'];
        $user->syncly_access_token = $d['access_token'];
        $user->syncly_access_expires_at = $d['access_expires_at'] ?? null;
        $user->save();
        return true;
    }

    public function bearer(User $user): ?string
    {
        if (empty($user->syncly_access_token)) {
            return null;
        }
        if ($this->tokenExpired($user)) {
            if (!$this->refresh($user)) {
                return null;
            }
            $user->refresh();
        }
        return $user->syncly_access_token;
    }

    public function exchange(User $user, string $email, string $password): bool
    {
        $callback = rtrim((string) config('app.url'), '/') . '/api/syncly';
        $data = $this->postJson($this->connectorPath('auth/exchange'), [
            'email' => $email,
            'password' => $password,
            'store_url' => $user->name,
            'store_name' => $user->name,
            'app_callback_url' => $callback,
        ]);
        if (!($data['success'] ?? false) || empty($data['data']['store_id'])) {
            Log::error('Syncly exchange failed', ['response' => $data]);
            return false;
        }
        $d = $data['data'];
        $user->syncly_store_id = $d['store_id'];
        $user->syncly_access_token = $d['access_token'];
        $user->syncly_refresh_token = $d['refresh_token'] ?? null;
        $user->syncly_access_expires_at = $d['access_expires_at'] ?? null;
        $user->syncly_webhook_secret = $d['webhook_secret'] ?? null;
        $user->save();
        return true;
    }

    public function ensureConnector(User $user): bool
    {
        if ($user->syncly_store_id && $user->syncly_access_token) {
            return true;
        }
        $email = (string) config('services.syncly.connector_email', '');
        $password = (string) config('services.syncly.connector_password', '');
        if ($email === '' || $password === '') {
            Log::warning('Syncly: set SYNCLY_CONNECTOR_EMAIL and SYNCLY_CONNECTOR_PASSWORD in .env');
            return false;
        }
        return $this->exchange($user, $email, $password);
    }

    public function revokeRemote(User $user): void
    {
        if (empty($user->syncly_store_id)) {
            return;
        }
        $this->postJson($this->connectorPath('auth/revoke'), [
            'store_id' => $user->syncly_store_id,
        ]);
    }

    public function ingestBatch(User $user, string $entity, array $records, string $runType = 'initial'): bool
    {
        if (!$this->ensureConnector($user)) {
            return false;
        }
        $token = $this->bearer($user);
        if (!$token) {
            return false;
        }
        $data = $this->postJson($this->connectorPath('sync/batch'), [
            'entity' => $entity,
            'records' => $records,
            'origin' => 'shopify',
            'run_type' => $runType,
        ], $token);
        return (bool) ($data['success'] ?? false);
    }

    public function ingestDelta(User $user, string $entity, string $operation, string $externalId, array $data): bool
    {
        if (!$this->ensureConnector($user)) {
            return false;
        }
        $token = $this->bearer($user);
        if (!$token) {
            return false;
        }
        $payload = array_merge($data, ['id' => $externalId]);
        $resp = $this->postJson($this->connectorPath('sync/delta'), [
            'entity' => $entity,
            'operation' => $operation,
            'external_id' => $externalId,
            'origin' => 'shopify',
            'data' => $payload,
        ], $token);
        return (bool) ($resp['success'] ?? false);
    }
}
