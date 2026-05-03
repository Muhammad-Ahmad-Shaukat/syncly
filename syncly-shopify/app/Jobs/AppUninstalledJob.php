<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\SynclyConnectorClient;
use Illuminate\Support\Facades\Log;
use Osiset\ShopifyApp\Contracts\Commands\Shop;
use Osiset\ShopifyApp\Actions\CancelCurrentPlan;
use Osiset\ShopifyApp\Objects\Values\ShopDomain;
use Osiset\ShopifyApp\Contracts\Queries\Shop as QueriesShop;

class AppUninstalledJob extends \Osiset\ShopifyApp\Messaging\Jobs\AppUninstalledJob
{
    public $tries = 1;

    public function handle(Shop $shopCommand, QueriesShop $shopQuery, CancelCurrentPlan $cancelCurrentPlanAction): bool
    {
        $this->shopDomain = ShopDomain::fromNative($this->shopDomain);
        $shop = $shopQuery->getByDomain($this->shopDomain);
        $user = User::where('name', $shop->name)->first();
        if ($user) {
            try {
                app(SynclyConnectorClient::class)->revokeRemote($user);
            } catch (\Throwable $e) {
                Log::warning('Syncly revoke on uninstall failed: ' . $e->getMessage());
            }
            $user->syncly_store_id = null;
            $user->syncly_access_token = null;
            $user->syncly_refresh_token = null;
            $user->syncly_access_expires_at = null;
            $user->syncly_webhook_secret = null;
            $user->save();
        }

        return parent::handle($shopCommand, $shopQuery, $cancelCurrentPlanAction);
    }
}
