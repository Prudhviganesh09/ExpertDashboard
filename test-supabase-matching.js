require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found in environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPropertyMatching() {
    console.log('🔍 Testing property matching with given preferences...\n');
    
    const preferences = {
        budget: 1,
        budgetUnit: 'Crores',
        propertyType: 'Apartment',
        possession: 'Ready to Move In',
        locations: [
            'Uppal', 'Boduppal', 'Habsiguda', 'Medipally', 'Nacharam', 
            'Narapally', 'Peerzadiguda', 'Nagole', 'L.B Nagar', 'Hastinapuram', 
            'Karmanghat', 'Kothapet', 'Mansoorabad', 'Meerpet', 'Saidabad'
        ],
        configuration: '2 BHK'
    };

    console.log('📋 Search Criteria:');
    console.log('  Budget: ₹' + preferences.budget + ' ' + preferences.budgetUnit);
    console.log('  Property Type:', preferences.propertyType);
    console.log('  Possession:', preferences.possession);
    console.log('  Configuration:', preferences.configuration);
    console.log('  Locations:', preferences.locations.join(', '));
    console.log('\n');

    const budgetInRupees = preferences.budget * 10000000;
    const budgetMin = budgetInRupees * 0.5;
    const budgetMax = budgetInRupees;

    console.log('💰 Budget Range in Rupees:');
    console.log('  Min: ₹' + budgetMin.toLocaleString('en-IN'));
    console.log('  Max: ₹' + budgetMax.toLocaleString('en-IN'));
    console.log('\n');

    let query = supabase.from('verified_properties').select('*');
    
    query = query.gte('Base Project Price', budgetMin).lte('Base Project Price', budgetMax);
    console.log('✅ Budget filter applied');

    const bhkNumber = preferences.configuration.match(/(\d+\.?\d*)/)[1];
    query = query.eq('BHK', bhkNumber);
    console.log('✅ Configuration filter applied (BHK: ' + bhkNumber + ')');

    if (preferences.propertyType) {
        query = query.ilike('property_type', `%${preferences.propertyType}%`);
        console.log('✅ Property type filter applied:', preferences.propertyType);
    }

    const locationFilters = preferences.locations.map(loc => `AreaName.ilike.%${loc}%`).join(',');
    query = query.or(locationFilters);
    console.log('✅ Location filter applied');

    console.log('\n🔄 Executing query...\n');

    const { data, error, count } = await query;

    if (error) {
        console.error('❌ Error querying Supabase:', error);
        return;
    }

    console.log('📊 RESULTS:');
    console.log('  Total Matched Properties:', data ? data.length : 0);
    console.log('\n');

    if (data && data.length > 0) {
        console.log('🏠 Matched Properties:\n');
        data.forEach((property, index) => {
            console.log(`${index + 1}. ${property.ProjectName || 'Unknown'}`);
            console.log(`   📍 Location: ${property.AreaName || 'N/A'}`);
            console.log(`   💰 Price: ₹${property['Base Project Price'] ? (property['Base Project Price'] / 10000000).toFixed(2) + ' Cr' : 'N/A'}`);
            console.log(`   🏠 Configuration: ${property.BHK || 'N/A'} BHK`);
            console.log(`   📦 Size: ${property['SQ FEET'] || 'N/A'} sq ft`);
            console.log(`   🏛️ Type: ${property.property_type || 'N/A'}`);
            console.log(`   🔑 Possession: ${property.Possession_Date || 'N/A'}`);
            console.log(`   🏗️ Builder: ${property.BuilderName || 'N/A'}`);
            console.log('');
        });
    } else {
        console.log('❌ No matching properties found');
        console.log('\n🔍 Debugging: Let\'s check what\'s in the database...\n');
        
        const { data: sampleData } = await supabase
            .from('verified_properties')
            .select('ProjectName, AreaName, BHK, "Base Project Price", property_type')
            .limit(5);
        
        if (sampleData && sampleData.length > 0) {
            console.log('📋 Sample properties in database:');
            sampleData.forEach((prop, i) => {
                console.log(`  ${i + 1}. ${prop.ProjectName} - ${prop.AreaName} - ${prop.BHK} BHK - ₹${(prop['Base Project Price'] / 10000000).toFixed(2)} Cr - ${prop.property_type}`);
            });
        }
    }
}

testPropertyMatching().catch(console.error);
