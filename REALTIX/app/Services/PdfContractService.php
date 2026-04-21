<?php

namespace App\Services;

use App\Models\ContractTemplate;
use App\Models\GeneratedContract;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PdfContractService
{
    public function generate(ContractTemplate $template, array $data, int $userId): GeneratedContract
    {
        $rendered = $this->renderContent($template->content, $data);

        $html = view('contracts.pdf_wrapper', [
            'content' => $rendered,
            'title'   => $template->name,
        ])->render();

        $pdf  = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        $path = 'contracts/' . Str::uuid() . '.pdf';
        Storage::put('public/' . $path, $pdf->output());

        return GeneratedContract::create([
            'agency_id'   => auth()->user()->agency_id,
            'user_id'     => $userId,
            'template_id' => $template->id,
            'property_id' => $data['property_id'] ?? null,
            'contact_id'  => $data['contact_id'] ?? null,
            'data'        => $data,
            'pdf_path'    => $path,
        ]);
    }

    private function renderContent(string $content, array $data): string
    {
        foreach ($data as $key => $value) {
            $content = str_replace('{' . $key . '}', e((string) ($value ?? '')), $content);
        }
        return $content;
    }
}
