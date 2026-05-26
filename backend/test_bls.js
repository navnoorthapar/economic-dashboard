async function testFetch() {
    try {
        const res = await fetch('http://localhost:8080/api/bls/cpi');
        const data = await res.json();
        
        if (!data || !data.Results || !data.Results.series || !data.Results.series[0]) {
            console.log("No data returned");
            return;
        }
        
        const apiData = data.Results.series[0].data;
        console.log("Sample apiData:", apiData.slice(0, 3));
        
        const getValue = (y, p) => {
            const row = apiData.find(d => String(d.year) === String(y) && d.period === p);
            return row ? parseFloat(row.value) : null;
        };

        const calcPercentChange = (current, previous) => {
            if (current === null || previous === null || previous === 0) return null;
            return ((current - previous) / previous) * 100;
        };

        const getOffsetPeriod = (currentYear, currentPeriodStr, monthOffset) => {
            if (!currentPeriodStr.startsWith('M')) return { year: currentYear, period: currentPeriodStr };
            let month = parseInt(currentPeriodStr.slice(1), 10);
            let year = currentYear;
            month -= monthOffset;
            while (month <= 0) {
                month += 12;
                year -= 1;
            }
            return { year, period: `M${month.toString().padStart(2, '0')}` };
        };

        const extendedData = apiData.map(row => {
            const currentYear = parseInt(row.year, 10);
            const currentVal = parseFloat(row.value);
            
            const yoyRowVal = getValue(currentYear - 1, row.period);
            const yoy = calcPercentChange(currentVal, yoyRowVal);

            const pm = getOffsetPeriod(currentYear, row.period, 1);
            const momRowVal = getValue(pm.year, pm.period);
            const mom = calcPercentChange(currentVal, momRowVal);

            const pq = getOffsetPeriod(currentYear, row.period, 3);
            const qoqRowVal = getValue(pq.year, pq.period);
            const qoq = calcPercentChange(currentVal, qoqRowVal);

            const ytdRowVal = getValue(currentYear - 1, 'M12');
            const ytd = calcPercentChange(currentVal, ytdRowVal);

            return { ...row, yoy, mom, qoq, ytd };
        });

        console.log("Sample extendedData:", extendedData.slice(0, 3));

        const metrics = ['yoy', 'mom', 'qoq', 'ytd'];
        const stats = {};

        metrics.forEach(m => {
            const validValues = extendedData.map(d => d[m]).filter(v => v !== null);
            if (validValues.length > 0) {
                const mean = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
                const variance = validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / validValues.length;
                const std = Math.sqrt(variance) || 1;
                stats[m] = { mean, std, validCount: validValues.length };
            } else {
                stats[m] = { mean: 0, std: 1, validCount: 0 };
            }
        });

        console.log("Stats:", Object.entries(stats).map(([k, v]) => `${k}: mean=${v.mean}, std=${v.std}, cnt=${v.validCount}`).join('\n'));

        const finalData = extendedData.map(row => {
            const zScores = {
                yoy: row.yoy !== null ? (row.yoy - stats.yoy.mean) / stats.yoy.std : null,
                mom: row.mom !== null ? (row.mom - stats.mom.mean) / stats.mom.std : null,
            };
            return { year: row.year, period: row.period, zYoy: zScores.yoy, zMom: zScores.mom };
        });
        console.log("Sample finalData:", finalData.slice(0, 3));
    } catch (e) {
        console.error(e);
    }
}
testFetch();
