<?php

namespace App\Http\Controllers;

class SynclyHomeController extends Controller
{
    public function index()
    {
        return $this->render('SynclyHome', [
            'synclyApiConfigured' => (bool) config('services.syncly.url'),
        ]);
    }
}
