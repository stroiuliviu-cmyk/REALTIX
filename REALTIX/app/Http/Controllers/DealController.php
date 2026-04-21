<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\Deal;
use App\Models\Property;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DealController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $deals = Deal::with(['contact', 'property'])
            ->when(! $user->isAdmin(), fn ($q) => $q->where('user_id', $user->id))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        $stats = [
            'total_volume' => Deal::where('status', 'closed')->sum('value'),
            'total_commission' => Deal::where('status', 'closed')->sum('commission'),
            'active_count' => Deal::whereNotIn('status', ['closed', 'lost'])->count(),
        ];

        return Inertia::render('Deals/Index', [
            'deals' => $deals,
            'stats' => $stats,
            'filters' => $request->only(['status']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'contact_id' => 'required|exists:contacts,id',
            'property_id' => 'nullable|exists:properties,id',
            'status' => 'required|in:new,negotiation,advance,signing,closed,lost',
            'value' => 'nullable|numeric|min:0',
            'commission_percent' => 'nullable|numeric|min:0|max:100',
            'currency' => 'required|in:EUR,USD,MDL',
            'notes' => 'nullable|string',
        ]);

        if (isset($data['value']) && isset($data['commission_percent'])) {
            $data['commission'] = $data['value'] * $data['commission_percent'] / 100;
        }

        Deal::create(array_merge($data, ['user_id' => $request->user()->id]));

        return redirect()->route('deals.index')->with('success', 'Tranzacția a fost creată.');
    }

    public function update(Request $request, Deal $deal)
    {
        $data = $request->validate([
            'status' => 'required|in:new,negotiation,advance,signing,closed,lost',
            'value' => 'nullable|numeric|min:0',
            'commission_percent' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string',
        ]);

        if ($data['status'] === 'closed' && ! $deal->closed_at) {
            $data['closed_at'] = now();
        }

        if (isset($data['value']) && isset($data['commission_percent'])) {
            $data['commission'] = $data['value'] * $data['commission_percent'] / 100;
        }

        $deal->update($data);

        return redirect()->back()->with('success', 'Tranzacția a fost actualizată.');
    }
}
