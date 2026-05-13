<?php

namespace App\Http\Controllers;

use App\Services\SynclyConnectorClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

class SynclyProxyController extends Controller
{
    protected function bearer(SynclyConnectorClient $client): ?string
    {
        $user = Auth::user();
        if (! $user) {
            return null;
        }
        if (! $client->ensureConnector($user)) {
            return null;
        }
        return $client->bearer($user);
    }

    protected function base(): string
    {
        return rtrim((string) config('services.syncly.url', ''), '/');
    }

    public function syncRuns(SynclyConnectorClient $client)
    {
        $token = $this->bearer($client);
        if (! $token) {
            return response()->json([
                'success' => false,
                'error' => 'Connect your Syncly account (set SYNCLY_CONNECTOR_EMAIL / PASSWORD or complete exchange).',
            ], 422);
        }
        $res = Http::timeout(60)->withToken($token)->get($this->base().'/api/syncly/sync/runs');
        return response()->json($res->json(), $res->status());
    }

    public function syncEvents(Request $request, SynclyConnectorClient $client)
    {
        $token = $this->bearer($client);
        if (! $token) {
            return response()->json([
                'success' => false,
                'error' => 'Connect your Syncly account first.',
            ], 422);
        }
        $limit = $request->query('limit', '100');
        $res = Http::timeout(60)->withToken($token)->get($this->base().'/api/syncly/sync/events?limit='.urlencode((string) $limit));
        return response()->json($res->json(), $res->status());
    }

    public function products(Request $request, SynclyConnectorClient $client)
    {
        $token = $this->bearer($client);
        if (! $token) {
            return response()->json(['success' => false, 'error' => 'Connect your Syncly account first.'], 422);
        }
        $qs = http_build_query($request->query());
        $url = $this->base().'/api/syncly/products'.($qs ? '?'.$qs : '');
        $res = Http::timeout(60)->withToken($token)->get($url);
        return response()->json($res->json(), $res->status());
    }

    public function triggerSync(Request $request, SynclyConnectorClient $client)
    {
        $token = $this->bearer($client);
        if (! $token) {
            return response()->json(['success' => false, 'error' => 'Connect your Syncly account first.'], 422);
        }
        $res = Http::timeout(120)->withToken($token)->post($this->base().'/api/syncly/sync/trigger', $request->all());
        return response()->json($res->json(), $res->status());
    }
}
