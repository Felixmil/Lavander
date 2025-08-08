/* Lavender Pricing Calculator */
(function () {
    "use strict";

    const currency = new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

    // Distinct lavender-inspired palette
    const palette = {
        materials: {
            bg: 'rgba(199,162,245,0.95)', // soft lavender
            border: 'rgba(167,139,250,1)'
        },
        labour: {
            bg: 'rgba(147,51,234,0.95)', // deep violet
            border: 'rgba(126,34,206,1)'
        },
        overhead: {
            bg: 'rgba(59,130,246,0.95)', // periwinkle blue
            border: 'rgba(37,99,235,1)'
        },
        profit: {
            bg: 'rgba(34,197,94,0.95)', // fresh green
            border: 'rgba(22,163,74,1)'
        }
    };

    function select(id) {
        return document.getElementById(id);
    }

    function parseNumber(input) {
        const value = parseFloat(input.value);
        return Number.isFinite(value) ? value : 0;
    }

    function roundToNearest(value, step) {
        if (step <= 0) return value;
        return Math.round(value / step) * step;
    }

    function computeCosts({
        costPerUnit,
        shippingMaterials,
        numUnits,
        timeHours,
        hourlyRate,
        designHours,
        commsHours,
        shippingHours,
    }) {
        const materialsTotal = costPerUnit * numUnits + shippingMaterials;
        const productionTotal = timeHours * hourlyRate;
        const overheadTotal = (designHours + commsHours + shippingHours) * hourlyRate;
        const labourTotal = productionTotal + overheadTotal;
        const totalCost = materialsTotal + labourTotal;
        const costPerUnitOut = numUnits > 0 ? totalCost / numUnits : 0;
        return {
            materialsTotal,
            productionTotal,
            overheadTotal,
            labourTotal,
            totalCost,
            costPerUnitOut,
        };
    }

    function priceWithMargin(costPerUnit, marginPercent) {
        const marginMultiplier = 1 + (marginPercent || 0) / 100;
        return costPerUnit * marginMultiplier;
    }

    function computeTierRoundedByTTC(baseCostPerUnit, marginPercent, roundingStep) {
        const htPrice = priceWithMargin(baseCostPerUnit, marginPercent);
        const ttcPrice = htPrice * 1.20;
        const roundedTTC = roundToNearest(ttcPrice, roundingStep);
        const derivedHT = roundedTTC / 1.20;
        return { ht: derivedHT, ttc: roundedTTC };
    }

    function priceMeta(pricePerUnit, numUnits, totalCost) {
        const totalRevenue = pricePerUnit * numUnits;
        const profit = totalRevenue - totalCost;
        const marginOnCost = totalCost > 0 ? (profit / totalCost) * 100 : 0;
        return {
            totalRevenue,
            profit,
            marginOnCost,
        };
    }

    function update() {
        const costPerUnitIn = parseNumber(select("costPerUnit"));
        const shippingMaterials = parseNumber(select("shippingMaterials"));
        const numUnits = Math.max(0, Math.floor(parseNumber(select("numUnits"))));
        const timeHours = parseNumber(select("timeHours"));
        const hourlyRate = parseNumber(select("hourlyRate"));
        const designHours = parseNumber(select("designHours"));
        const commsHours = parseNumber(select("commsHours"));
        const shippingHours = parseNumber(select("shippingHours"));
        const customPrice = parseNumber(select("customPrice"));

        const costs = computeCosts({
            costPerUnit: costPerUnitIn,
            shippingMaterials,
            numUnits,
            timeHours,
            hourlyRate,
            designHours,
            commsHours,
            shippingHours,
        });

        // Outputs: costs
        // Removed per-category value boxes from top section; values now visualized in donut chart
        select("totalCost").textContent = currency.format(costs.totalCost);
        select("costPerUnitOut").textContent = currency.format(costs.costPerUnitOut);
        select("unitsOut").textContent = String(numUnits);

        // Suggestions (round TTC to nearest 0.10, then derive HT from TTC)
        const roundingStep = 0.1;
        const be = computeTierRoundedByTTC(costs.costPerUnitOut, 0, roundingStep);
        const bu = computeTierRoundedByTTC(costs.costPerUnitOut, 25, roundingStep);
        const st = computeTierRoundedByTTC(costs.costPerUnitOut, 50, roundingStep);
        const pr = computeTierRoundedByTTC(costs.costPerUnitOut, 100, roundingStep);
        const cu = {
            ht: Math.max(0, customPrice || 0),
            ttc: roundToNearest(Math.max(0, customPrice || 0) * 1.20, roundingStep)
        };
        const customMarginPct = costs.costPerUnitOut > 0
            ? ((cu.ht - costs.costPerUnitOut) / costs.costPerUnitOut) * 100
            : 0;
        const customMarginPctRounded = Math.round(customMarginPct);

        const tiers = [
            { id: "BreakEven", value: be.ht, ttc: be.ttc, label: "Break-even", margin: 0 },
            { id: "Budget", value: bu.ht, ttc: bu.ttc, label: "Budget (25% margin)", margin: 25 },
            { id: "Standard", value: st.ht, ttc: st.ttc, label: "Standard (50% margin)", margin: 50 },
            { id: "Premium", value: pr.ht, ttc: pr.ttc, label: "Premium (100% margin)", margin: 100 },
            { id: "Custom", value: cu.ht, ttc: cu.ttc, label: `Custom (${customMarginPctRounded}% margin)`, margin: customMarginPctRounded },
        ];

        // Update custom label in the suggestions grid to reflect computed margin
        const customLabelEl = document.querySelector('[data-tier="custom"] .suggestion-label');
        if (customLabelEl) customLabelEl.textContent = `Custom (${customMarginPctRounded}% margin)`;

        for (const tier of tiers) {
            const price = tier.value;
            const meta = priceMeta(price, numUnits, costs.totalCost);
            select(`suggest${tier.id}`).textContent = currency.format(price);
            const ttcEl = document.getElementById(`suggest${tier.id}TTC`);
            if (ttcEl) ttcEl.textContent = `TTC: ${currency.format(tier.ttc)}`;
            const metaEl = select(`suggest${tier.id}Meta`);
            if (metaEl) {
                metaEl.innerHTML = `Revenue (HT): ${currency.format(meta.totalRevenue)}<br/>Profit (HT): ${currency.format(meta.profit)}`;
            }
        }

        // Update charts (multi-bar strategies + donut breakdown)
        renderStrategiesChart(costs, numUnits, tiers);
        renderBreakdownDonut(costs);
    }

    function resetInputs() {
        const ids = [
            "costPerUnit",
            "shippingMaterials",
            "numUnits",
            "timeHours",
            "hourlyRate",
            "designHours",
            "commsHours",
            "shippingHours",
            "customPrice",
        ];
        ids.forEach((id) => (select(id).value = ""));
        update();
    }

    function init() {
        const form = document.getElementById("inputsForm");
        form.addEventListener("input", update);
        document.getElementById("resetBtn").addEventListener("click", resetInputs);

        // sensible defaults for quicker start
        select("costPerUnit").value = "0.3";
        select("shippingMaterials").value = "20";
        select("numUnits").value = "100";
        select("timeHours").value = "4";
        select("hourlyRate").value = "25";
        select("designHours").value = "1.0";
        select("commsHours").value = "1";
        select("shippingHours").value = "0.5";
        // no default for custom desired price

        update();
    }

    document.addEventListener("DOMContentLoaded", init);

    // Chart rendering
    let strategiesChart = null;
    let breakdownChart = null;

    function renderStrategiesChart(costs, numUnits, tiers) {
        if (!window.Chart) return;
        const ctx = document.getElementById('strategyChart');
        if (!ctx) return;
        const styles = getComputedStyle(document.documentElement);

        const labels = tiers.map(t => t.label);
        const pricePerUnitList = tiers.map(t => t.value);
        const revenueList = pricePerUnitList.map(p => p * numUnits);
        const profitList = revenueList.map(r => Math.max(0, r - costs.totalCost));

        const data = {
            labels,
            datasets: [
                { label: 'Materials', data: labels.map(() => costs.materialsTotal), backgroundColor: palette.materials.bg, borderColor: palette.materials.border, borderWidth: 1, stack: 'stack0' },
                { label: 'Production', data: labels.map(() => costs.productionTotal), backgroundColor: palette.labour.bg, borderColor: palette.labour.border, borderWidth: 1, stack: 'stack0' },
                { label: 'Overhead', data: labels.map(() => costs.overheadTotal), backgroundColor: palette.overhead.bg, borderColor: palette.overhead.border, borderWidth: 1, stack: 'stack0' },
                { label: 'Profit', data: profitList, backgroundColor: palette.profit.bg, borderColor: palette.profit.border, borderWidth: 1, stack: 'stack0' },
            ]
        };
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: styles.getPropertyValue('--text') || '#fff' } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${currency.format(ctx.parsed.y)}` } }
            },
            scales: {
                x: { stacked: true, ticks: { color: styles.getPropertyValue('--muted') || '#ccc' }, grid: { color: 'rgba(255,255,255,0.08)' } },
                y: { stacked: true, ticks: { color: styles.getPropertyValue('--muted') || '#ccc' }, grid: { color: 'rgba(255,255,255,0.08)' } },
            }
        };
        if (strategiesChart) strategiesChart.destroy();
        strategiesChart = new Chart(ctx, { type: 'bar', data, options });
    }

    function renderBreakdownDonut(costs) {
        if (!window.Chart) return;
        const ctx = document.getElementById('costBreakdownChart');
        if (!ctx) return;
        const styles = getComputedStyle(document.documentElement);
        const data = {
            labels: ['Materials', 'Production', 'Overhead'],
            datasets: [{
                data: [costs.materialsTotal, costs.productionTotal, costs.overheadTotal],
                backgroundColor: [palette.materials.bg, palette.labour.bg, palette.overhead.bg],
                borderColor: [palette.materials.border, palette.labour.border, palette.overhead.border],
                borderWidth: 1
            }]
        };
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { color: styles.getPropertyValue('--text') || '#fff' } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${currency.format(ctx.parsed)}` } }
            }
        };
        if (breakdownChart) breakdownChart.destroy();
        breakdownChart = new Chart(ctx, { type: 'doughnut', data, options });
    }
})();


