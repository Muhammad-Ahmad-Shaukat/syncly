<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\SynclyHomeController;
use App\Http\Controllers\SynclyOnboardingController;
use App\Http\Controllers\SynclyProxyController;

/*
| Shopify Admin / App Bridge may request paths under /.well-known/shopify/ on your app URL.
| Responding with 204 avoids noisy 404/421 responses in devtools when behind tunnels or proxies.
*/
Route::any('/.well-known/shopify/{rest}', fn () => response()->noContent())
    ->where('rest', '.*');

Route::post('/syncly/check-email', [SynclyOnboardingController::class, 'checkEmail'])
    ->name('syncly.check-email');

Route::group(['middleware' => ['verify.embedded', 'verify.shopify']], function () {

    Route::get('/', [DashboardController::class, 'index'])->name('home');
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/search', [DashboardController::class, 'orderSeacrhfilter'])->name('search');

    Route::get('/syncly', [SynclyHomeController::class, 'index'])->name('syncly.home');
    Route::get('/syncly/proxy/sync-runs', [SynclyProxyController::class, 'syncRuns'])->name('syncly.proxy.sync-runs');
    Route::get('/syncly/proxy/sync-events', [SynclyProxyController::class, 'syncEvents'])->name('syncly.proxy.sync-events');
    Route::get('/syncly/proxy/products', [SynclyProxyController::class, 'products'])->name('syncly.proxy.products');
    Route::get('/syncly/proxy/trigger', [SynclyProxyController::class, 'triggerSync'])->name('syncly.proxy.trigger');
});

require __DIR__ . '/auth.php';
