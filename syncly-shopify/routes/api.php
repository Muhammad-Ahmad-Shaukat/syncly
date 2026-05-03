<?php

use App\Http\Controllers\SynclyCommandController;
use Illuminate\Support\Facades\Route;

Route::post('/syncly/commands', [SynclyCommandController::class, 'handle'])
    ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class]);
