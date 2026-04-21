<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\ContractTemplate;
use App\Models\GeneratedContract;
use App\Models\Property;
use App\Services\PdfContractService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ContractTemplateController extends Controller
{
    public function index(): Response
    {
        $templates = ContractTemplate::latest()->get();
        $generated = GeneratedContract::with(['template', 'property', 'contact'])
            ->latest()
            ->limit(20)
            ->get();

        return Inertia::render('Contracts/Index', [
            'templates' => $templates,
            'generated' => $generated,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'    => 'required|string|max:255',
            'type'    => 'required|in:sale,rent,mandate,advance,handover',
            'locale'  => 'required|in:ro,ru,en',
            'content' => 'required|string',
        ]);

        ContractTemplate::create(array_merge($data, [
            'agency_id' => $request->user()->agency_id,
        ]));

        return back()->with('success', 'Șablonul a fost creat.');
    }

    public function update(Request $request, ContractTemplate $contractTemplate)
    {
        $data = $request->validate([
            'name'    => 'required|string|max:255',
            'type'    => 'required|in:sale,rent,mandate,advance,handover',
            'locale'  => 'required|in:ro,ru,en',
            'content' => 'required|string',
        ]);

        $contractTemplate->update($data);

        return back()->with('success', 'Șablonul a fost actualizat.');
    }

    public function destroy(ContractTemplate $contractTemplate)
    {
        $contractTemplate->delete();
        return back()->with('success', 'Șablonul a fost șters.');
    }

    public function generate(Request $request, ContractTemplate $contractTemplate, PdfContractService $pdf)
    {
        $data = $request->validate([
            'property_id' => 'nullable|exists:properties,id',
            'contact_id'  => 'nullable|exists:contacts,id',
            'fields'      => 'nullable|array',
        ]);

        $fillData = $data['fields'] ?? [];
        $fillData['property_id'] = $data['property_id'] ?? null;
        $fillData['contact_id']  = $data['contact_id'] ?? null;

        if ($fillData['property_id']) {
            $p = Property::find($fillData['property_id']);
            $fillData['adresa_proprietate'] = $p?->address ?? '';
            $fillData['pret']               = $p?->price ?? '';
            $fillData['valuta']             = $p?->currency ?? 'EUR';
        }
        if ($fillData['contact_id']) {
            $c = Contact::find($fillData['contact_id']);
            $fillData['nume_client']    = trim(($c?->first_name ?? '') . ' ' . ($c?->last_name ?? ''));
            $fillData['telefon_client'] = $c?->phone ?? '';
            $fillData['email_client']   = $c?->email ?? '';
        }

        $contract = $pdf->generate($contractTemplate, $fillData, $request->user()->id);

        return back()->with('success', 'Contractul a fost generat. <a href="/storage/' . $contract->pdf_path . '" target="_blank">Descarcă PDF</a>');
    }
}
