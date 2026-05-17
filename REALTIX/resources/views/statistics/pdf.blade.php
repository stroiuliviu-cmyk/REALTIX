<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 9pt; color: #1a1a1a; line-height: 1.5; }
    .page { padding: 28px 36px; }

    .hdr { width: 100%; border-collapse: collapse; border-bottom: 2px solid #1E3A8A; padding-bottom: 10px; margin-bottom: 16px; }
    .hdr td { vertical-align: middle; padding-bottom: 4px; }
    .agency-name { font-size: 14pt; font-weight: bold; color: #1E3A8A; letter-spacing: 0.5px; }
    .doc-meta { font-size: 8pt; color: #555; text-align: right; line-height: 1.5; }
    .title { font-size: 16pt; font-weight: bold; text-align: center; margin: 18px 0 4px; color: #1E3A8A; }
    .subtitle { font-size: 9pt; text-align: center; color: #666; margin-bottom: 18px; }

    h2 { font-size: 11pt; color: #1E3A8A; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #cbd5e1; }

    .grid { display: table; width: 100%; border-collapse: separate; border-spacing: 6px; margin-bottom: 8px; }
    .stat { display: table-cell; width: 25%; background: #f1f5f9; border-radius: 6px; padding: 8px 10px; vertical-align: top; }
    .stat .lbl { font-size: 7.5pt; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.4px; }
    .stat .val { font-size: 14pt; font-weight: bold; color: #0f172a; margin-top: 2px; }
    .stat .sub { font-size: 7.5pt; color: #94a3b8; margin-top: 1px; }

    table.t { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 8.5pt; }
    table.t th { background: #1E3A8A; color: white; text-align: left; padding: 6px 8px; font-weight: bold; font-size: 8pt; }
    table.t td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
    table.t tr:nth-child(even) td { background: #f8fafc; }
    .num { text-align: right; }

    .footer { position: fixed; bottom: 12px; left: 36px; right: 36px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 7.5pt; color: #888; }
    .ftr-tbl { width: 100%; border-collapse: collapse; }
    .ftr-tbl td { vertical-align: middle; }

    .delta-up   { color: #059669; font-weight: bold; }
    .delta-down { color: #dc2626; font-weight: bold; }
</style>
</head>
<body>
<div class="page">

    {{-- Header --}}
    <table class="hdr">
        <tr>
            <td>
                @if(($agency->logo_path ?? null))
                    <img src="{{ public_path('storage/' . $agency->logo_path) }}" style="max-height:36px;max-width:100px;margin-bottom:3px;">
                    <br>
                @endif
                <div class="agency-name">{{ $agency->name ?? 'REALTIX' }}</div>
                <div style="font-size:8pt;color:#555;">{{ $agency->settings['address'] ?? '' }}</div>
            </td>
            <td class="doc-meta" style="width:35%;">
                <div><strong>Generat de:</strong> {{ $user->name }}</div>
                <div><strong>Email:</strong> {{ $user->email }}</div>
                <div><strong>Data:</strong> {{ $generatedAt->format('d.m.Y H:i') }}</div>
            </td>
        </tr>
    </table>

    <div class="title">Raport de statistici</div>
    <div class="subtitle">{{ $periodLabel }} · {{ $isAdmin ? 'Vedere agenție (admin)' : 'Vedere personală (agent)' }}</div>

    @php
        // Helper: format money
        $money = fn($v) => number_format((float) $v, 0, '.', ' ');
        $pct = function($current, $prev) {
            if (! $prev) return null;
            return round((($current - $prev) / $prev) * 100, 1);
        };
    @endphp

    @php
        $sections = $sections ?? null;
        $wants = fn (string $key) => $sections === null || in_array($key, $sections, true);
    @endphp

    @if($isAdmin)
        {{-- ============ ADMIN ============ --}}

        @if($wants('summary'))
        <h2>📊 Sumar agenție</h2>
        <div class="grid">
            <div class="stat">
                <div class="lbl">Proprietăți</div>
                <div class="val">{{ $propertiesTotal }}</div>
                <div class="sub">{{ $propertiesActive }} active</div>
            </div>
            <div class="stat">
                <div class="lbl">Contacte</div>
                <div class="val">{{ $contactsTotal }}</div>
            </div>
            <div class="stat">
                <div class="lbl">Apeluri ({{ strtolower($periodLabel) }})</div>
                <div class="val">{{ $callsPeriod }}</div>
                <div class="sub">{{ $callsTotal }} total</div>
            </div>
            <div class="stat">
                <div class="lbl">Conv. apel→tranz.</div>
                <div class="val">{{ $callConversion }}%</div>
            </div>
        </div>

        <div class="grid">
            <div class="stat">
                <div class="lbl">Tranzacții ({{ strtolower($periodLabel) }})</div>
                <div class="val">{{ $dealsPeriod }}</div>
            </div>
            <div class="stat">
                <div class="lbl">Venit ({{ strtolower($periodLabel) }})</div>
                <div class="val">{{ $money($revenuePeriod) }} €</div>
                @if(($delta = $pct($revenuePeriod, $revenuePrev)) !== null)
                    <div class="sub {{ $delta >= 0 ? 'delta-up' : 'delta-down' }}">
                        {{ $delta >= 0 ? '↑' : '↓' }} {{ abs($delta) }}% vs perioadă anterioară
                    </div>
                @endif
            </div>
            <div class="stat">
                <div class="lbl">Comision mediu</div>
                <div class="val">{{ $money($avgCommission) }} €</div>
            </div>
            <div class="stat">
                <div class="lbl">Zile mediu închidere</div>
                <div class="val">{{ $avgDaysToClose }}</div>
            </div>
        </div>
        @endif

        @if($wants('by_type'))
        <h2>🏢 Proprietăți pe tip</h2>
        <table class="t">
            <thead>
                <tr><th>Tip</th><th class="num">Total</th></tr>
            </thead>
            <tbody>
                @foreach($propertiesByType as $type => $count)
                    <tr><td>{{ ucfirst($type) }}</td><td class="num">{{ $count }}</td></tr>
                @endforeach
                @if(count($propertiesByType) === 0)
                    <tr><td colspan="2" style="color:#94a3b8;text-align:center;">Fără date</td></tr>
                @endif
            </tbody>
        </table>
        @endif

        @if($wants('agents'))
        <h2>👥 Performanță agenți</h2>
        <table class="t">
            <thead>
                <tr>
                    <th>Nume</th>
                    <th class="num">Propr.</th>
                    <th class="num">Tranz.</th>
                    <th class="num">Contacte</th>
                    <th class="num">Apeluri</th>
                    <th class="num">Vizit.</th>
                    <th class="num">Venit (€)</th>
                    <th class="num">Zile mediu</th>
                </tr>
            </thead>
            <tbody>
                @foreach($agentStats as $a)
                    <tr>
                        <td><strong>{{ $a['name'] }}</strong></td>
                        <td class="num">{{ $a['properties_count'] }}</td>
                        <td class="num">{{ $a['deals_count'] }}</td>
                        <td class="num">{{ $a['contacts_count'] }}</td>
                        <td class="num">{{ $a['calls_count'] }}</td>
                        <td class="num">{{ $a['views_total'] }}</td>
                        <td class="num">{{ $money($a['revenue']) }}</td>
                        <td class="num">{{ $a['avg_days_close'] ?? '—' }}</td>
                    </tr>
                @endforeach
                @if(count($agentStats) === 0)
                    <tr><td colspan="8" style="color:#94a3b8;text-align:center;">Niciun agent</td></tr>
                @endif
            </tbody>
        </table>
        @endif

        @if($wants('revenue_monthly'))
        <h2>💰 Venit pe luni (an curent)</h2>
        <table class="t">
            <thead>
                <tr><th>Luna</th><th class="num">Venit (€)</th></tr>
            </thead>
            <tbody>
                @foreach($revenueByMonth as $m)
                    <tr>
                        <td>{{ ['', 'Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'][$m['month']] ?? $m['month'] }}</td>
                        <td class="num">{{ $money($m['total']) }}</td>
                    </tr>
                @endforeach
                @if(count($revenueByMonth) === 0)
                    <tr><td colspan="2" style="color:#94a3b8;text-align:center;">Fără tranzacții închise anul acesta</td></tr>
                @endif
            </tbody>
        </table>
        @endif

        @if($wants('top_districts'))
        <h2>📍 Top districte (anunțuri săptămâna asta)</h2>
        <table class="t">
            <thead>
                <tr><th>District</th><th class="num">Anunțuri</th></tr>
            </thead>
            <tbody>
                @foreach($top5Districts as $d)
                    <tr><td>{{ $d['district'] }}</td><td class="num">{{ $d['count'] }}</td></tr>
                @endforeach
                @if(count($top5Districts) === 0)
                    <tr><td colspan="2" style="color:#94a3b8;text-align:center;">Fără date</td></tr>
                @endif
            </tbody>
        </table>
        @endif

        @if($wants('avg_price'))
        <h2>💵 Preț mediu €/m² pe district</h2>
        <table class="t">
            <thead>
                <tr><th>District</th><th class="num">Preț mediu (€)</th><th class="num">Anunțuri</th></tr>
            </thead>
            <tbody>
                @foreach($avgPriceByDistrict as $d)
                    <tr>
                        <td>{{ $d['district'] }}</td>
                        <td class="num">{{ $money($d['avg_price']) }}</td>
                        <td class="num">{{ $d['count'] }}</td>
                    </tr>
                @endforeach
                @if(count($avgPriceByDistrict) === 0)
                    <tr><td colspan="3" style="color:#94a3b8;text-align:center;">Fără date</td></tr>
                @endif
            </tbody>
        </table>
        @endif

        @if($wants('ai_insights') && !empty($aiInsights))
            <h2>🤖 AI Insights</h2>
            @if(!empty($aiInsights['trends']))
                <h3 style="font-size:11pt;color:#475569;margin:8px 0 4px;">Predicții tendințe</h3>
                <ul style="padding-left:18px;margin:4px 0;">
                    @foreach($aiInsights['trends'] as $t)
                        <li style="margin-bottom:4px;"><strong>{{ $t['badge'] ?? '' }}:</strong> {{ $t['text'] ?? '' }}</li>
                    @endforeach
                </ul>
            @endif
            @if(!empty($aiInsights['priceRecommendations']))
                <h3 style="font-size:11pt;color:#475569;margin:10px 0 4px;">Recomandări prețuri</h3>
                <table class="t">
                    <thead><tr><th>Agent</th><th>Recomandare</th></tr></thead>
                    <tbody>
                        @foreach($aiInsights['priceRecommendations'] as $r)
                            <tr><td><strong>{{ $r['name'] ?? '' }}</strong></td><td>{{ $r['text'] ?? '' }}</td></tr>
                        @endforeach
                    </tbody>
                </table>
            @endif
            @if(!empty($aiInsights['forecast']))
                <h3 style="font-size:11pt;color:#475569;margin:10px 0 4px;">Prognoză venit</h3>
                <table class="t">
                    <thead><tr><th>Orizont</th><th class="num">Variație</th><th class="num">Estimare €</th></tr></thead>
                    <tbody>
                        <tr><td>Luna viitoare</td><td class="num">{{ ($aiInsights['forecast']['next_month']['pct'] ?? 0) >= 0 ? '+' : '' }}{{ $aiInsights['forecast']['next_month']['pct'] ?? 0 }}%</td><td class="num">{{ $money($aiInsights['forecast']['next_month']['amount'] ?? 0) }}</td></tr>
                        <tr><td>Trimestrul viitor</td><td class="num">{{ ($aiInsights['forecast']['next_quarter']['pct'] ?? 0) >= 0 ? '+' : '' }}{{ $aiInsights['forecast']['next_quarter']['pct'] ?? 0 }}%</td><td class="num">{{ $money($aiInsights['forecast']['next_quarter']['amount'] ?? 0) }}</td></tr>
                        <tr><td>Sfârșitul anului</td><td class="num">{{ ($aiInsights['forecast']['next_year']['pct'] ?? 0) >= 0 ? '+' : '' }}{{ $aiInsights['forecast']['next_year']['pct'] ?? 0 }}%</td><td class="num">{{ $money($aiInsights['forecast']['next_year']['amount'] ?? 0) }}</td></tr>
                    </tbody>
                </table>
            @endif
        @endif

    @else
        {{-- ============ REALTOR ============ --}}

        @if($wants('summary'))
        <h2>📊 Sumar personal</h2>
        <div class="grid">
            <div class="stat">
                <div class="lbl">Proprietăți</div>
                <div class="val">{{ $propertiesTotal }}</div>
                <div class="sub">{{ $propertiesActive }} active · {{ $propertiesArchived }} arhivate</div>
            </div>
            <div class="stat">
                <div class="lbl">Vizualizări</div>
                <div class="val">{{ $viewsTotal }}</div>
            </div>
            <div class="stat">
                <div class="lbl">Contacte</div>
                <div class="val">{{ $contactsTotal }}</div>
            </div>
            <div class="stat">
                <div class="lbl">Apeluri ({{ strtolower($periodLabel) }})</div>
                <div class="val">{{ $myCallsPeriod }}</div>
                <div class="sub">{{ $myCallsTotal }} total</div>
            </div>
        </div>

        <div class="grid">
            <div class="stat">
                <div class="lbl">Tranzacții închise</div>
                <div class="val">{{ $myDealsTotal }}</div>
                <div class="sub">{{ $myDealsInProgress }} în lucru</div>
            </div>
            <div class="stat">
                <div class="lbl">Conv. apel→tranz.</div>
                <div class="val">{{ $callConversion }}%</div>
            </div>
            <div class="stat">
                <div class="lbl">Venit ({{ strtolower($periodLabel) }})</div>
                <div class="val">{{ $money($revenuePeriod) }} €</div>
            </div>
            <div class="stat">
                <div class="lbl">Venit total</div>
                <div class="val">{{ $money($revenueTotal) }} €</div>
            </div>
        </div>
        @endif

        @if($wants('top_properties'))
        <h2>🏆 Top 3 proprietăți (după vizualizări)</h2>
        <table class="t">
            <thead>
                <tr><th>ID</th><th>Titlu</th><th class="num">Vizualizări</th><th>Status</th><th>Tip</th></tr>
            </thead>
            <tbody>
                @foreach($top3Properties as $p)
                    <tr>
                        <td>#{{ $p['id'] }}</td>
                        <td>{{ $p['title'] }}</td>
                        <td class="num">{{ $p['views_count'] }}</td>
                        <td>{{ $p['status'] }}</td>
                        <td>{{ $p['type'] }}</td>
                    </tr>
                @endforeach
                @if(count($top3Properties) === 0)
                    <tr><td colspan="5" style="color:#94a3b8;text-align:center;">Nicio proprietate</td></tr>
                @endif
            </tbody>
        </table>
        @endif

        @if($wants('revenue_monthly'))
        <h2>💰 Venit pe luni (an curent)</h2>
        <table class="t">
            <thead>
                <tr><th>Luna</th><th class="num">Venit (€)</th></tr>
            </thead>
            <tbody>
                @foreach($revenueByMonth as $m)
                    <tr>
                        <td>{{ ['', 'Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'][$m['month']] ?? $m['month'] }}</td>
                        <td class="num">{{ $money($m['total']) }}</td>
                    </tr>
                @endforeach
                @if(count($revenueByMonth) === 0)
                    <tr><td colspan="2" style="color:#94a3b8;text-align:center;">Fără tranzacții închise anul acesta</td></tr>
                @endif
            </tbody>
        </table>
        @endif
    @endif

</div>

<div class="footer">
    <table class="ftr-tbl">
        <tr>
            <td>Generat prin REALTIX · {{ $generatedAt->format('d.m.Y H:i') }}</td>
            <td style="text-align:right;color:#1E3A8A;font-weight:bold;">REALTIX</td>
        </tr>
    </table>
</div>
</body>
</html>
