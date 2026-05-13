<?php

namespace App\Http\Controllers;

use App\Services\SynclyMerchantApi;
use Illuminate\Http\Request;

class SynclyOnboardingController extends Controller
{
    /**
     * Public JSON: check if email exists in Syncly backend (Shopify install onboarding).
     */
    public function checkEmail(Request $request, SynclyMerchantApi $api)
    {
        $validated = $request->validate([
            'email' => 'required|email',
        ]);
        $result = $api->checkEmail($validated['email']);
        return response()->json($result, ($result['success'] ?? false) ? 200 : 422);
    }
}
