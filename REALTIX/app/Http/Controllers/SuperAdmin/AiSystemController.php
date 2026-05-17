<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\FeatureFlag;
use App\Services\SuperAdmin\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AiSystemController extends Controller
{
    public function index(Request $request): Response
    {
        $monthAgo = now()->subDays(30);

        $requests = DB::table('ai_requests')
            ->leftJoin('users', 'users.id', '=', 'ai_requests.user_id')
            ->leftJoin('agencies', 'agencies.id', '=', 'ai_requests.agency_id')
            ->select(
                'ai_requests.id',
                'ai_requests.type as action',
                'ai_requests.input_tokens as tokens_in',
                'ai_requests.output_tokens as tokens_out',
                'ai_requests.cost_usd', 'ai_requests.flagged', 'ai_requests.created_at',
                'users.name as user_name', 'users.email as user_email',
                'agencies.name as agency_name',
            )
            ->when($request->flagged, fn ($q) => $q->where('ai_requests.flagged', true))
            ->when($request->user_id, fn ($q, $u) => $q->where('ai_requests.user_id', $u))
            ->orderByDesc('ai_requests.created_at')
            ->paginate(30)->withQueryString();

        $totalRequests30 = DB::table('ai_requests')->where('created_at', '>=', $monthAgo)->count();
        $totalCost30     = (float) DB::table('ai_requests')->where('created_at', '>=', $monthAgo)->sum('cost_usd');
        $totalTokens30   = (int) DB::table('ai_requests')->where('created_at', '>=', $monthAgo)->sum(DB::raw('COALESCE(input_tokens,0) + COALESCE(output_tokens,0)'));
        $flaggedAll      = DB::table('ai_requests')->where('flagged', true)->count();

        $byAction = DB::table('ai_requests')
            ->selectRaw('type as action, COUNT(*) as cnt, SUM(cost_usd) as cost')
            ->where('created_at', '>=', $monthAgo)
            ->groupBy('type')
            ->orderByRaw('COUNT(*) DESC')
            ->get();

        $topAgencies = DB::table('ai_requests')
            ->join('agencies', 'agencies.id', '=', 'ai_requests.agency_id')
            ->selectRaw('agencies.name, agencies.id, COUNT(*) as cnt, SUM(cost_usd) as cost')
            ->where('ai_requests.created_at', '>=', $monthAgo)
            ->groupBy('agencies.id', 'agencies.name')
            ->orderByDesc('cnt')
            ->limit(10)->get();

        return Inertia::render('SuperAdmin/AiSystem/Index', [
            'requests'    => $requests,
            'stats'       => [
                'requests_30d' => $totalRequests30,
                'cost_30d'     => round($totalCost30, 4),
                'tokens_30d'   => $totalTokens30,
                'flagged_all'  => $flaggedAll,
            ],
            'byAction'    => $byAction,
            'topAgencies' => $topAgencies,
            'aiDisabled'  => FeatureFlag::where('key', 'ai.disabled')->where('enabled', true)->exists(),
            'filters'     => $request->only(['flagged', 'user_id']),
        ]);
    }

    public function toggleKillSwitch(Request $request, AuditLogger $audit): RedirectResponse
    {
        $flag = FeatureFlag::firstOrCreate(
            ['key' => 'ai.disabled'],
            ['enabled' => false, 'description' => 'Global AI kill-switch — when ON, all AI features blocked.', 'rollout_percent' => 100, 'updated_by_user_id' => $request->user()->id],
        );
        $flag->update(['enabled' => ! $flag->enabled, 'updated_by_user_id' => $request->user()->id]);
        $audit->record('ai.kill_switch.toggle', null, 'AI globally ' . ($flag->enabled ? 'DISABLED' : 'enabled'));
        return back()->with($flag->enabled ? 'warning' : 'success',
            $flag->enabled ? '🛑 AI dezactivat global pentru toți utilizatorii.' : '✅ AI reactivat.');
    }
}
