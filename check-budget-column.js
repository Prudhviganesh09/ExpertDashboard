require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBudgetColumn() {
    console.log('🔍 INVESTIGATING THE BUDGET COLUMN\n');
    
    const budgetInRupees = 1 * 10000000; // 1 Cr
    const budgetMin = budgetInRupees * 0.5; // 50L
    const budgetMax = budgetInRupees; // 1 Cr
    
    console.log('Target Budget Range:');
    console.log(`  Min: ${budgetMin} (₹${(budgetMin/10000000).toFixed(2)} Cr)`);
    console.log(`  Max: ${budgetMax} (₹${(budgetMax/10000000).toFixed(2)} Cr)\n`);

    console.log('TEST 1: Get 2 BHK properties and examine their Base Project Price values');
    console.log('━'.repeat(70));
    const test1 = await supabase
        .from('verified_properties')
        .select('ProjectName, AreaName, BHK, "Base Project Price"')
        .eq('BHK', '2')
        .limit(10);
    
    if (test1.data) {
        console.log('Property Name | Area | Base Project Price (raw) | Price (Cr)');
        console.log('-'.repeat(70));
        test1.data.forEach(p => {
            const rawPrice = p['Base Project Price'];
            const priceInCr = rawPrice ? (rawPrice / 10000000).toFixed(2) : 'N/A';
            console.log(`${p.ProjectName.substring(0, 25).padEnd(25)} | ${p.AreaName.substring(0, 15).padEnd(15)} | ${String(rawPrice).padEnd(20)} | ₹${priceInCr} Cr`);
            
            // Check if it would match our range
            if (rawPrice) {
                const numPrice = parseFloat(rawPrice);
                const wouldMatch = numPrice >= budgetMin && numPrice <= budgetMax;
                const comparison = `  → ${numPrice} >= ${budgetMin} && ${numPrice} <= ${budgetMax} = ${wouldMatch}`;
                console.log(comparison);
            }
        });
    }

    console.log('\n\nTEST 2: Apply budget filter with numeric comparison');
    console.log('━'.repeat(70));
    const test2 = await supabase
        .from('verified_properties')
        .select('ProjectName, AreaName, BHK, "Base Project Price"')
        .eq('BHK', '2')
        .gte('Base Project Price', budgetMin)
        .lte('Base Project Price', budgetMax)
        .limit(10);
    
    console.log(`Query: .gte('Base Project Price', ${budgetMin}).lte('Base Project Price', ${budgetMax})`);
    console.log(`Found: ${test2.data?.length || 0} properties\n`);
    
    if (test2.error) {
        console.error('Error:', test2.error);
    }

    console.log('\nTEST 3: Try different budget comparison approaches');
    console.log('━'.repeat(70));
    
    // Try comparing as text
    console.log('\nApproach A: Filter using .gt() and .lt() instead of .gte() and .lte()');
    const test3a = await supabase
        .from('verified_properties')
        .select('ProjectName, BHK, "Base Project Price"')
        .eq('BHK', '2')
        .gt('Base Project Price', budgetMin - 1)
        .lt('Base Project Price', budgetMax + 1)
        .limit(10);
    console.log(`  Found: ${test3a.data?.length || 0} properties`);

    // Try selecting all and filtering manually
    console.log('\nApproach B: Get all 2 BHK and filter manually in JavaScript');
    const test3b = await supabase
        .from('verified_properties')
        .select('ProjectName, BHK, "Base Project Price"')
        .eq('BHK', '2')
        .limit(100);
    
    if (test3b.data) {
        const filtered = test3b.data.filter(p => {
            const price = parseFloat(p['Base Project Price']);
            return !isNaN(price) && price >= budgetMin && price <= budgetMax;
        });
        console.log(`  All 2 BHK: ${test3b.data.length} properties`);
        console.log(`  Within budget after manual filter: ${filtered.length} properties`);
        
        if (filtered.length > 0) {
            console.log('\n  Properties that match:');
            filtered.forEach((p, i) => {
                const price = parseFloat(p['Base Project Price']);
                console.log(`    ${i+1}. ${p.ProjectName} - ₹${(price/10000000).toFixed(2)} Cr`);
            });
        }
    }

    console.log('\n\nTEST 4: Check data type of Base Project Price column');
    console.log('━'.repeat(70));
    const test4 = await supabase
        .from('verified_properties')
        .select('"Base Project Price"')
        .eq('BHK', '2')
        .limit(5);
    
    if (test4.data) {
        console.log('Data type analysis:');
        test4.data.forEach((p, i) => {
            const value = p['Base Project Price'];
            console.log(`  ${i+1}. Value: ${value}, Type: ${typeof value}, Is Number: ${typeof value === 'number'}`);
        });
    }
}

checkBudgetColumn().catch(console.error);
