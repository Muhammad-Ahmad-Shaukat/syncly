<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class SynclyMerchantApi
{
    protected function base(): string
    {
        return rtrim((string) config('services.syncly.url', ''), '/');
    }

    public function checkEmail(string $email): array
    {
        $url = $this->base().'/api/syncly/auth/check-email';
        $res = Http::timeout(15)
            ->acceptJson()
            ->post($url, ['email' => $email]);
        $data = $res->json();
        if (! is_array($data)) {
            return ['success' => false, 'error' => 'Syncly returned an invalid response.'];
        }
        return $data;
    }
}
