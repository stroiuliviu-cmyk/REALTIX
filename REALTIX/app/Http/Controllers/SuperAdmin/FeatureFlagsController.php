<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\FeatureFlag;
use App\Services\SuperAdmin\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FeatureFlagsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('SuperAdmin/FeatureFlags/Index', [
            'flags' => FeatureFlag::with('updatedBy:id,name')->orderBy('key')->get(),
        ]);
    }

    public function store(Request $request, AuditLogger $audit): RedirectResponse
    {
        $data = $request->validate([
            'key'             => 'required|string|max:100|unique:feature_flags,key|regex:/^[a-z0-9_\.\-]+$/',
            'description'     => 'nullable|string|max:500',
            'enabled'         => 'boolean',
            'rollout_percent' => 'integer|min:0|max:100',
        ]);

        $flag = FeatureFlag::create([
            ...$data,
            'updated_by_user_id' => $request->user()->id,
        ]);
        $audit->record('feature_flag.create', $flag, "Created flag {$flag->key}");

        return back()->with('success', "Feature flag „{$flag->key}\" creat.");
    }

    public function update(Request $request, FeatureFlag $flag, AuditLogger $audit): RedirectResponse
    {
        $data = $request->validate([
            'enabled'         => 'sometimes|boolean',
            'description'     => 'sometimes|nullable|string|max:500',
            'rollout_percent' => 'sometimes|integer|min:0|max:100',
        ]);

        $oldEnabled = $flag->enabled;
        $flag->update([...$data, 'updated_by_user_id' => $request->user()->id]);

        if (array_key_exists('enabled', $data) && $oldEnabled !== $data['enabled']) {
            $audit->record(
                'feature_flag.toggle',
                $flag,
                "Flag {$flag->key} → " . ($data['enabled'] ? 'ON' : 'OFF'),
                ['old' => $oldEnabled, 'new' => $data['enabled']]
            );
        }

        return back()->with('success', 'Flag actualizat.');
    }

    public function destroy(FeatureFlag $flag, AuditLogger $audit): RedirectResponse
    {
        $key = $flag->key;
        $flag->delete();
        $audit->record('feature_flag.delete', null, "Deleted flag {$key}");
        return back()->with('success', "Flag „{$key}\" șters.");
    }
}
