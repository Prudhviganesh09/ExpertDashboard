require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugFilters() {
    console.log('🔍 DEBUGGING EACH FILTER INDIVIDUALLY\n');
    
    const preferences = {
        budget: 1,
        budgetUnit: 'Crores',
        propertyType: 'Apartment',
        configuration: '2 BHK',
        locations: [
            'Uppal', 'Boduppal', 'Habsiguda', 'Medipally', 'Nacharam', 
            'Narapally', 'Peerzadiguda', 'Nagole', 'L.B Nagar', 'Hastinapuram', 
            'Karmanghat', 'Kothapet', 'Mansoorabad', 'Meerpet', 'Saidabad'
        ]
    };

    const budgetInRupees = preferences.budget * 10000000;
    const budgetMin = budgetInRupees * 0.5;
    const budgetMax = budgetInRupees;

    console.log('TEST 1: All 2 BHK properties (no filters)');
    console.log('━'.repeat(60));
    const test1 = await supabase
        .from('verified_properties')
        .select('ProjectName, AreaName, BHK, "Base Project Price", property_type')
        .eq('BHK', '2')
        .limit(20);
    console.log(`Found ${test1.data?.length || 0} total 2 BHK properties`);
    if (test1.data && test1.data.length > 0) {
        test1.data.forEach((p, i) => {
            const price = p['Base Project Price'] ? (p['Base Project Price'] / 10000000).toFixed(2) : 'N/A';
            console.log(`  ${i+1}. ${p.ProjectName} - ${p.AreaName} - ${p.BHK} BHK - ₹${price} Cr - ${p.property_type}`);
        });
    }

    console.log('\nTEST 2: 2 BHK + Budget filter (₹50L - ₹1Cr)');
    console.log('━'.repeat(60));
    const test2 = await supabase
        .from('verified_properties')
        .select('ProjectName, AreaName, BHK, "Base Project Price", property_type')
        .eq('BHK', '2')
        .gte('Base Project Price', budgetMin)
        .lte('Base Project Price', budgetMax)
        .limit(20);
    console.log(`Found ${test2.data?.length || 0} properties`);
    if (test2.data && test2.data.length > 0) {
        test2.data.forEach((p, i) => {
            const price = p['Base Project Price'] ? (p['Base Project Price'] / 10000000).toFixed(2) : 'N/A';
            console.log(`  ${i+1}. ${p.ProjectName} - ${p.AreaName} - ${p.BHK} BHK - ₹${price} Cr - ${p.property_type}`);
        });
    }

    console.log('\nTEST 3: 2 BHK + Budget + Property Type (Apartment)');
    console.log('━'.repeat(60));
    const test3 = await supabase
        .from('verified_properties')
        .select('ProjectName, AreaName, BHK, "Base Project Price", property_type')
        .eq('BHK', '2')
        .gte('Base Project Price', budgetMin)
        .lte('Base Project Price', budgetMax)
        .ilike('property_type', '%Apartment%')
        .limit(20);
    console.log(`Found ${test3.data?.length || 0} properties`);
    if (test3.data && test3.data.length > 0) {
        test3.data.forEach((p, i) => {
            const price = p['Base Project Price'] ? (p['Base Project Price'] / 10000000).toFixed(2) : 'N/A';
            console.log(`  ${i+1}. ${p.ProjectName} - ${p.AreaName} - ${p.BHK} BHK - ₹${price} Cr - ${p.property_type}`);
        });
    }

    console.log('\nTEST 4: Check if any properties exist in the requested locations');
    console.log('━'.repeat(60));
    console.log('Checking locations:', preferences.locations.join(', '));
    
    for (const location of preferences.locations) {
        const locTest = await supabase
            .from('verified_properties')
            .select('ProjectName, AreaName, BHK, "Base Project Price"')
            .ilike('AreaName', `%${location}%`)
            .limit(5);
        
        if (locTest.data && locTest.data.length > 0) {
            console.log(`\n  ✅ Found ${locTest.data.length} properties in ${location}:`);
            locTest.data.forEach((p, i) => {
                const price = p['Base Project Price'] ? (p['Base Project Price'] / 10000000).toFixed(2) : 'N/A';
                console.log(`     ${i+1}. ${p.ProjectName} - ${p.BHK} BHK - ₹${price} Cr`);
            });
        }
    }

    console.log('\n\nTEST 5: Full filter with ALL criteria');
    console.log('━'.repeat(60));
    let query = supabase.from('verified_properties').select('*');
    
    query = query.gte('Base Project Price', budgetMin).lte('Base Project Price', budgetMax);
    query = query.eq('BHK', '2');
    query = query.ilike('property_type', '%Apartment%');
    
    const locationFilters = preferences.locations.map(loc => `AreaName.ilike.%${loc}%`).join(',');
    query = query.or(locationFilters);

    const { data, error } = await query.limit(50);

    if (error) {
        console.error('❌ Error:', error);
    } else {
        console.log(`Found ${data?.length || 0} properties matching ALL criteria`);
        if (data && data.length > 0) {
            data.forEach((p, i) => {
                const price = p['Base Project Price'] ? (p['Base Project Price'] / 10000000).toFixed(2) : 'N/A';
                console.log(`  ${i+1}. ${p.ProjectName} - ${p.AreaName} - ${p.BHK} BHK - ₹${price} Cr - ${p.property_type}`);
            });
        }
    }

    console.log('\n\nTEST 6: What areas have 2 BHK Apartments under 1 Cr?');
    console.log('━'.repeat(60));
    const test6 = await supabase
        .from('verified_properties')
        .select('ProjectName, AreaName, BHK, "Base Project Price", property_type')
        .eq('BHK', '2')
        .gte('Base Project Price', budgetMin)
        .lte('Base Project Price', budgetMax)
        .ilike('property_type', '%Apartment%')
        .order('Base Project Price', { ascending: true })
        .limit(20);
    
    console.log(`Found ${test6.data?.length || 0} 2 BHK Apartments within budget`);
    if (test6.data && test6.data.length > 0) {
        console.log('\nAvailable areas:');
        const areas = new Set();
        test6.data.forEach((p) => {
            areas.add(p.AreaName);
        });
        areas.forEach(area => console.log(`  - ${area}`));
        
        console.log('\nAll properties:');
        test6.data.forEach((p, i) => {
            const price = p['Base Project Price'] ? (p['Base Project Price'] / 10000000).toFixed(2) : 'N/A';
            console.log(`  ${i+1}. ${p.ProjectName} - ${p.AreaName} - ₹${price} Cr`);
        });
    }
}

debugFilters().catch(console.error);
