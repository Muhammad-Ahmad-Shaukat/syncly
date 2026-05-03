<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SynclyCommandController extends Controller
{
    public function handle(Request $request): JsonResponse
    {
        $secret = $request->header('X-Syncly-Webhook-Secret');
        $storeId = (int) $request->input('store_id');
        $user = User::query()->where('syncly_store_id', $storeId)->first();
        if (!$user || !$user->syncly_webhook_secret || !hash_equals((string) $user->syncly_webhook_secret, (string) $secret)) {
            return response()->json(['failed' => true, 'reason' => 'Unauthorized'], 403);
        }

        $entity = (string) $request->input('entity');
        $operation = (string) $request->input('operation', 'update');
        $externalId = (string) $request->input('external_id');
        $data = (array) $request->input('data', []);

        try {
            if ($entity === 'product') {
                return response()->json($this->applyProductCommand($user, $operation, $externalId, $data));
            }
            if ($entity === 'order') {
                return response()->json($this->applyOrderCommand($user, $operation, $externalId, $data));
            }
            return response()->json(['failed' => true, 'reason' => 'Unsupported entity'], 400);
        } catch (\Throwable $e) {
            Log::error('Syncly command failed', ['e' => $e->getMessage()]);
            return response()->json(['failed' => true, 'reason' => $e->getMessage()], 500);
        }
    }

    protected function applyProductCommand(User $user, string $operation, string $externalId, array $data): array
    {
        if ($operation === 'delete' && $externalId !== '') {
            $user->api()->rest('DELETE', '/admin/products/' . $externalId . '.json');
            return ['applied' => true];
        }
        $payload = ['product' => []];
        if (!empty($data['title'])) {
            $payload['product']['title'] = $data['title'];
        }
        if (isset($data['status'])) {
            $payload['product']['status'] = $data['status'];
        }
        if ($payload['product'] === []) {
            return ['skipped' => true, 'reason' => 'No product fields to update'];
        }
        $user->api()->rest('PUT', '/admin/products/' . $externalId . '.json', [], $payload);
        return ['applied' => true];
    }

    protected function applyOrderCommand(User $user, string $operation, string $externalId, array $data): array
    {
        if ($externalId === '') {
            return ['failed' => true, 'reason' => 'Missing external_id'];
        }
        if ($operation === 'update' && !empty($data['status'])) {
            $user->api()->rest('PUT', '/admin/orders/' . $externalId . '.json', [], [
                'order' => ['id' => (int) $externalId, 'status' => $data['status']],
            ]);
            return ['applied' => true];
        }
        return ['skipped' => true, 'reason' => 'No valid order action'];
    }
}
