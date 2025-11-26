require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findMatchingProperties() {
    console.log('🔍 FINDING PROPERTIES THAT MATCH ALL CRITERIA\n');
    
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

    console.log('Search Criteria:');
    console.log(`  Budget: ₹${(budgetMin/10000000).toFixed(2)} Cr - ₹${(budgetMax/10000000).toFixed(2)} Cr`);
    console.log(`  Property Type: ${preferences.propertyType}`);
    console.log(`  Configuration: ${preferences.configuration}`);
    console.log(`  Locations: ${preferences.locations.join(', ')}`);
    console.log('\n');

    const { data: allProperties } = await supabase
        .from('verified_properties')
        .select('*')
        .eq('BHK', '2');

    console.log(`Total 2 BHK properties in database: ${allProperties?.length || 0}\n`);

    if (!allProperties) {
        console.log('No properties found');
        return;
    }

    const matchedProperties = allProperties.filter(p => {
        const price = parseFloat(p['Base Project Price']);
        const priceMatch = !isNaN(price) && price >= budgetMin && price <= budgetMax;
        
        const typeMatch = !preferences.propertyType || 
            (p.property_type && p.property_type.toLowerCase().includes(preferences.propertyType.toLowerCase()));
        
        const locationMatch = preferences.locations.some(loc => 
            p.AreaName && p.AreaName.toLowerCase().includes(loc.toLowerCase())
        );

        return priceMatch && typeMatch && locationMatch;
    });

    console.log('━'.repeat(80));
    console.log(`✅ MATCHED PROPERTIES: ${matchedProperties.length}`);
    console.log('━'.repeat(80));
    console.log('\n');

    if (matchedProperties.length > 0) {
        matchedProperties.forEach((p, i) => {
            const price = parseFloat(p['Base Project Price']);
            console.log(`${i + 1}. ${p.ProjectName}`);
            console.log(`   📍 Location: ${p.AreaName}`);
            console.log(`   💰 Price: ₹${(price/10000000).toFixed(2)} Cr`);
            console.log(`   🏠 Configuration: ${p.BHK} BHK`);
            console.log(`   📦 Size: ${p['SQ FEET']} sq ft`);
            console.log(`   🏛️ Type: ${p.property_type}`);
            console.log(`   🏗️ Builder: ${p.BuilderName}`);
            console.log(`   🔑 Possession: ${p.Possession_Date}`);
            console.log(`   📋 RERA: ${p.RERA_Number || 'N/A'}`);
            console.log('');
        });

        console.log('━'.repeat(80));
        console.log('SUMMARY BY LOCATION:');
        console.log('━'.repeat(80));
        const locationGroups = {};
        matchedProperties.forEach(p => {
            const area = p.AreaName;
            if (!locationGroups[area]) {
                locationGroups[area] = [];
            }
            locationGroups[area].push(p);
        });

        Object.keys(locationGroups).sort().forEach(area => {
            console.log(`\n${area}: ${locationGroups[area].length} properties`);
            locationGroups[area].forEach(p => {
                const price = parseFloat(p['Base Project Price']);
                console.log(`  - ${p.ProjectName} (₹${(price/10000000).toFixed(2)} Cr)`);
            });
        });
    } else {
        console.log('❌ No properties matched all criteria\n');
        
        console.log('Let\'s check step by step:\n');
        
        const budgetMatches = allProperties.filter(p => {
            const price = parseFloat(p['Base Project Price']);
            return !isNaN(price) && price >= budgetMin && price <= budgetMax;
        });
        console.log(`✓ 2 BHK within budget (₹${(budgetMin/10000000).toFixed(2)}-${(budgetMax/10000000).toFixed(2)} Cr): ${budgetMatches.length}`);
        
        const typeMatches = budgetMatches.filter(p => 
            p.property_type && p.property_type.toLowerCase().includes(preferences.propertyType.toLowerCase())
        );
        console.log(`✓ + Property type (${preferences.propertyType}): ${typeMatches.length}`);
        
        const locationMatches = typeMatches.filter(p =>
            preferences.locations.some(loc => 
                p.AreaName && p.AreaName.toLowerCase().includes(loc.toLowerCase())
            )
        );
        console.log(`✓ + Locations: ${locationMatches.length}`);
    }
}

findMatchingProperties().catch(console.error);
