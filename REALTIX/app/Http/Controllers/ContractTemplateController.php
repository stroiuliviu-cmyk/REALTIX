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
    private const TYPES = 'sale,rent,mandate,advance,handover,viewing_sheet,gdpr_consent,exclusive';

    public function index(): Response
    {
        $templates = ContractTemplate::latest()->get();

        $generated = GeneratedContract::with(['template', 'property', 'contact', 'user'])
            ->latest()
            ->limit(20)
            ->get();

        $properties = Property::select('id', 'title', 'address', 'city', 'price', 'currency', 'rooms', 'area_total', 'area_living', 'floor', 'meta')
            ->latest()
            ->limit(300)
            ->get();

        $contacts = Contact::select('id', 'first_name', 'last_name', 'phone', 'email')
            ->latest()
            ->limit(300)
            ->get();

        return Inertia::render('Contracts/Index', [
            'templates'  => $templates,
            'generated'  => $generated,
            'properties' => $properties,
            'contacts'   => $contacts,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'    => 'required|string|max:255',
            'type'    => 'required|in:' . self::TYPES,
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
            'type'    => 'required|in:' . self::TYPES,
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

    public function preview(ContractTemplate $contractTemplate): \Illuminate\Http\Response
    {
        $highlighted = preg_replace(
            '/\{(\w+)\}/',
            '<mark style="background:#dbeafe;color:#1d4ed8;border-radius:3px;padding:1px 4px;font-style:normal;">{$1}</mark>',
            $contractTemplate->content
        );

        $html = view('contracts.pdf_wrapper', [
            'content'    => $highlighted,
            'title'      => $contractTemplate->name,
            'agency'     => auth()->user()?->agency,
            'verifyCode' => 'PREVIZUALIZARE',
            'isPreview'  => true,
        ])->render();

        return response($html, 200)->header('Content-Type', 'text/html; charset=utf-8');
    }

    public function generate(Request $request, ContractTemplate $contractTemplate, PdfContractService $pdf)
    {
        $data = $request->validate([
            'property_id' => 'nullable|exists:properties,id',
            'contact_id'  => 'nullable|exists:contacts,id',
            'fields'      => 'nullable|array',
        ]);

        $fillData                = $data['fields'] ?? [];
        $fillData['property_id'] = $data['property_id'] ?? null;
        $fillData['contact_id']  = $data['contact_id'] ?? null;

        if ($fillData['property_id']) {
            $p = Property::find($fillData['property_id']);
            if ($p) {
                $fillData['adresa_proprietate']  = $p->address ?? '';
                $fillData['oras']                = $p->city ?? '';
                $fillData['pret']                = $p->price ?? '';
                $fillData['valuta']              = $p->currency ?? 'EUR';
                $fillData['numar_camere']        = $p->rooms ?? '';
                $fillData['suprafata']           = $p->area_total ?? '';
                $fillData['suprafata_locuibila'] = $p->area_living ?? '';
                $fillData['etaj']                = $p->floor ?? '';
                $fillData['titlu_proprietate']   = $p->title ?? '';
                $fillData['numar_cadastral']     = $p->meta['cadastre_number'] ?? '';
            }
        }

        if ($fillData['contact_id']) {
            $c = Contact::find($fillData['contact_id']);
            if ($c) {
                $fillData['nume_client']    = trim(($c->first_name ?? '') . ' ' . ($c->last_name ?? ''));
                $fillData['telefon_client'] = $c->phone ?? '';
                $fillData['email_client']   = $c->email ?? '';
            }
        }

        $user                    = $request->user();
        $agency                  = $user->agency;
        $fillData['nume_agent']  = $user->name ?? '';
        $fillData['email_agent'] = $user->email ?? '';
        $fillData['nume_agentie'] = $agency?->name ?? 'REALTIX';

        if (empty($fillData['data_contractului'])) {
            $fillData['data_contractului'] = now()->format('d.m.Y');
        }

        $contract = $pdf->generate($contractTemplate, $fillData, $user->id, $agency);

        return back()->with(
            'success',
            'Contractul a fost generat. <a href="/storage/' . $contract->pdf_path . '" target="_blank" style="text-decoration:underline;font-weight:600;">↓ Descarcă PDF</a>'
        );
    }
}
