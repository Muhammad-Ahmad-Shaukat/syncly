<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Providers\RouteServiceProvider;
use Symfony\Component\HttpFoundation\Response;

class RedirectIfAuthenticated
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$guards): Response
    {
        $guards = empty($guards) ? [null] : $guards;

        foreach ($guards as $guard) {
            if (Auth::guard($guard)->check()) {
                $query = array_filter([
                    'shop' => $request->query('shop'),
                    'host' => $request->query('host'),
                ], fn ($v) => $v !== null && $v !== '');

                $url = RouteServiceProvider::$home;
                if ($query !== []) {
                    $url .= '?'.http_build_query($query);
                }

                return redirect($url);
            }
        }
        return $next($request);
    }
}
