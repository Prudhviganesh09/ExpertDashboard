import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, ArrowUpDown, LogOut, Loader2, Plus, X, Edit, ChevronDown, ChevronUp, Check, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import ExpertScheduling from './ExpertScheduling';

// Interfaces
interface Lead {
  id: string;
  leadName: string;
  mobile: string;
  email: string;
  createdTime: string;
  leadStatus?: string;
  preSaleNotes?: string;
  preferences?: {
    budget?: string;
    propertyType?: string;
    possessionTimeline?: string;
    location?: string;
    configuration?: string;
    propertySize?: string;
    matchedPropertyCount?: string;
    financingOption?: string;
    includeGSTRegistration?: boolean;
  };
}

interface Requirement {
  id: number;
  name: string;
  source?: 'zoho' | 'supabase';
  preferences: {
    budget: string;
    location: string;
    possession: string;
    minBudget: string;
    maxBudget: string;
    configuration: string;
    propertyType: string;
    propertySize?: string;
    financingOption?: string;
    includeGSTRegistration?: string;
    matchedPropertyCount?: number;
  };
  matchedProperties?: any[];
  createdAt: string;
}

export default function ExpertDashboard() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('date-desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Requirement form state
  const [propertyType, setPropertyType] = useState<string>('');
  const [configurations, setConfigurations] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [locationPopoverOpen, setLocationPopoverOpen] = useState<boolean>(false);
  const [budgetAmount, setBudgetAmount] = useState<string>('');
  const [budgetUnit, setBudgetUnit] = useState<string>('Lakhs');
  const [possession, setPossession] = useState<string>('');
  const [financingOption, setFinancingOption] = useState<string>('Loan option');
  const [includeGSTRegistration, setIncludeGSTRegistration] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  // Saved requirements state
  const [savedRequirements, setSavedRequirements] = useState<Requirement[]>([]);
  const [expandedReq, setExpandedReq] = useState<number | null>(null);
  const [isFormCollapsed, setIsFormCollapsed] = useState<boolean>(false);
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null);
  const [currentRequirementIndex, setCurrentRequirementIndex] = useState<number>(0);

  // Fetch leads from API
  const { data: leadsData } = useQuery({
    queryKey: ['/api/zoho/leads'],
    queryFn: async () => {
      const userData = localStorage.getItem('userData');
      if (!userData) return { leads: [] };

      const user = JSON.parse(userData);
      const response = await fetch(`/api/zoho/leads?ownerEmail=${encodeURIComponent(user.email)}`);
      if (!response.ok) throw new Error('Failed to fetch leads');
      return response.json();
    },
  });

  const leads = leadsData?.leads || [];

  // Fetch requirements for selected lead
  const { data: requirementsData, isLoading: isLoadingRequirements } = useQuery({
    queryKey: ['/api/requirements', selectedLead?.mobile],
    queryFn: async () => {
      if (!selectedLead?.mobile) return { requirements: [] };
      const response = await fetch(`/api/requirements/${encodeURIComponent(selectedLead.mobile)}`);
      if (!response.ok) throw new Error('Failed to fetch requirements');
      return response.json();
    },
    enabled: !!selectedLead?.mobile,
  });

  // Helper function to build a Zoho requirement from lead preferences
  const buildZohoRequirement = (lead: Lead): Requirement | null => {
    if (!lead.preferences) return null;

    const prefs = lead.preferences;
    const hasAnyPreference = prefs.budget || prefs.propertyType || prefs.location || prefs.configuration;

    if (!hasAnyPreference) return null;

    return {
      id: -1, // Special ID for Zoho requirement
      name: 'Zoho Preferences',
      source: 'zoho',
      preferences: {
        budget: prefs.budget || '—',
        location: prefs.location || '—',
        possession: prefs.possessionTimeline || '—',
        minBudget: prefs.budget || '—',
        maxBudget: prefs.budget || '—',
        configuration: prefs.configuration || '—',
        propertyType: prefs.propertyType || '—',
        propertySize: prefs.propertySize || '—',
        financingOption: prefs.financingOption || '—',
        includeGSTRegistration: prefs.includeGSTRegistration ? 'Yes' : 'No',
      },
      matchedProperties: prefs.matchedPropertyCount ? Array(parseInt(prefs.matchedPropertyCount)).fill({}) : [],
      createdAt: new Date().toISOString(),
    };
  };

  // Update saved requirements when data loads or lead changes
  useEffect(() => {
    const supabaseRequirements = requirementsData?.requirements || [];
    const zohoRequirement = selectedLead ? buildZohoRequirement(selectedLead) : null;

    // Merge Zoho requirement (if exists) with Supabase requirements
    const mergedRequirements = zohoRequirement
      ? [zohoRequirement, ...supabaseRequirements]
      : supabaseRequirements;

    setSavedRequirements(mergedRequirements);
    setCurrentRequirementIndex(0); // Reset to first requirement
  }, [requirementsData, selectedLead]);

  // Initialize notes when a lead is selected
  useEffect(() => {
    if (selectedLead) {
      setNotes(selectedLead.preSaleNotes || '');
    } else {
      setNotes('');
    }
  }, [selectedLead]);

  // Auto-save notes to Zoho with debouncing
  useEffect(() => {
    if (!selectedLead) return;

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/zoho/leads/${selectedLead.id}/notes`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notes }),
        });

        if (!response.ok) {
          throw new Error('Failed to save notes');
        }

        console.log('Notes auto-saved to Zoho');
      } catch (error) {
        console.error('Error auto-saving notes:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [notes, selectedLead]);

  // Filter and sort leads
  const filteredLeads = leads
    .filter((lead: Lead) => {
      const searchMatch =
        lead.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.mobile.includes(searchQuery) ||
        (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const statusMatch = filterStatus === 'all' || lead.leadStatus === filterStatus;

      return searchMatch && statusMatch;
    })
    .sort((a: Lead, b: Lead) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime();
        case 'date-asc':
          return new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime();
        case 'name-asc':
          return a.leadName.localeCompare(b.leadName);
        case 'name-desc':
          return b.leadName.localeCompare(a.leadName);
        default:
          return 0;
      }
    });

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('cachedClients');
    localStorage.removeItem('clientAgentAssignments');

    toast({
      title: 'Logged out',
      description: 'You have been logged out successfully',
    });

    window.location.href = '/signin';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleConfiguration = (config: string) => {
    setConfigurations(prev =>
      prev.includes(config)
        ? prev.filter(c => c !== config)
        : [...prev, config]
    );
  };

  const configOptions = ['1 BHK', '1.5 BHK', '2 BHK', '2.5 BHK', '3 BHK', '3.5 BHK', '4 BHK', '4.5 BHK', '5 BHK', '6 BHK'];

  const LOCATION_AREA_MAPPING: Record<number, string[]> = {
    1: ["Kompally", "Bahadurpally", "Bolarum", "Dulapally", "Jeedimetla", "Quthbullapur"],
    2: ["Tellapur", "Gopanpally", "Nallagandla", "Osman Nagar"],
    3: ["Kokapet", "Nanakramguda", "Alkapur Main Road", "Financial District", "Gandipet", "Gundlapochampally", "Khajaguda", "Neopolis"],
    4: ["Patancheru", "Chitkul", "Isnapur", "Kistareddypet", "Krishna Reddy Pet", "Muthangi", "Ramachandrapuram"],
    5: ["Hitec City", "Gachibowli", "Guttala Begumpet", "Hafeezpet", "Kalyan Nagar", "Kondapur", "Kothaguda", "Madhapur"],
    6: ["Banjara Hills", "Jubilee Hills"],
    7: ["L.B Nagar", "Bandlaguda-Nagole", "Hastinapuram", "Karmanghat", "Kothapet", "Mansoorabad", "Meerpet", "Nagole", "Saidabad"],
    8: ["Ghatkesar", "Annojiguda", "Chengicherla", "Keesara", "Pocharam", "Rampally"],
    9: ["Shamshabad", "Tukkuguda", "Adibatla", "Budwel", "Kongara Kalan", "Laxmiguda", "Mamidpally", "Rajendra Nagar", "Raviryal", "Shadnagar"],
    10: ["Miyapur", "Chandanagar", "Lingampally", "Madeenaguda", "Madinaguda", "Nizampet", "Pragathi Nagar"],
    11: ["Abids", "Amberpet", "Ashok Nagar", "Domalaguda", "Himayat Nagar", "Kachiguda", "Kavadiguda", "Lakdikapul", "Nallakunta", "Padmarao Nagar"],
    12: ["Alwal", "Kapra", "Kowkur", "Old Bowenpally", "Secunderabad"],
    13: ["Appa Junction", "Bandlaguda Jagir", "Gandamguda", "Kismatpur", "Peeramcheru"],
    14: ["Attapur", "Mehdipatnam"],
    15: ["Ameenpur", "Beeramguda", "Serilingampally"],
    16: ["Uppal", "Boduppal", "Habsiguda", "Medipally", "Nacharam", "Narapally", "Peerzadiguda"],
    17: ["Hayathnagar", "Bacharam", "Injapur"],
    18: ["Ibrahimpatnam", "Mangalpalli", "Manneguda", "Nadergul"],
    19: ["Narsingi", "Manchirevula", "Manikonda", "NEKNAMPUR", "Neknampur", "Puppalguda"],
    20: ["Chevella", "Rudraram"],
    21: ["Shamirpet", "Hakimpet", "Podur"],
    22: ["Kukatpally", "Moosapet", "Moti Nagar", "Sanath Nagar"],
    23: ["Begumpet", "Punjagutta"],
    24: ["Bachupally", "Bollaram", "Bowrampet"],
    25: ["Shankarpally"],
    26: ["Gandi Maisamma", "Dundigal", "Gagillapur", "Gajularamaram"],
    27: ["Medchal", "Gowdavalli", "Kandlakoi", "Kandlakoya"],
    28: ["ECIL", "Dammaiguda", "Kamalanagar", "Malkajgiri", "Mallapur", "Moula Ali", "Nagaram", "Sainikpuri"],
    29: ["Kollur", "Mokila", "Pati Kollur", "Patighanpur"],
    31: ["Kandukur", "Chegur", "Gollur", "Maheshwaram", "Mansanpally"]
  };

  const allLocations = Array.from(new Set(Object.values(LOCATION_AREA_MAPPING).flat())).sort();

  const locationToGroupMap: Record<string, string[]> = {};
  Object.values(LOCATION_AREA_MAPPING).forEach(group => {
    group.forEach(location => {
      locationToGroupMap[location] = group;
    });
  });

  const handleLocationChange = (value: string) => {
    if (!value) return;

    if (value === 'All') {
      if (locations.length === allLocations.length) {
        setLocations([]);
      } else {
        setLocations([...allLocations]);
      }
      return;
    }

    if (locations.includes(value)) {
      setLocations(prev => prev.filter(loc => loc !== value));
    } else {
      const group = locationToGroupMap[value];
      if (group) {
        const newLocations = group.filter(loc => !locations.includes(loc));
        setLocations(prev => [...prev, ...newLocations]);
      } else {
        setLocations(prev => [...prev, value]);
      }
    }
  };

  const handleLocationRemove = (locationToRemove: string) => {
    setLocations(prev => prev.filter(loc => loc !== locationToRemove));
  };

  const handleEditRequirement = (requirement: Requirement) => {
    // Prevent editing Zoho requirements or requirements with invalid IDs
    if (requirement.source === 'zoho' || requirement.id < 1) {
      toast({
        title: 'Cannot edit this requirement',
        description: 'Zoho preferences cannot be edited here. Please edit them in Zoho CRM.',
        variant: 'destructive',
      });
      return;
    }

    setEditingRequirement(requirement);
    setPropertyType(requirement.preferences.propertyType || '');
    setConfigurations(requirement.preferences.configuration ? requirement.preferences.configuration.split(', ') : []);
    setLocations(requirement.preferences.location ? requirement.preferences.location.split(', ') : []);

    // Parse budget from budgetMin/budgetMax
    if (requirement.preferences.minBudget && requirement.preferences.minBudget !== 'Not specified') {
      const budgetValue = Number(requirement.preferences.minBudget);

      // Convert from rupees to Lakhs or Crores
      if (budgetValue >= 10000000) {
        // Crores
        setBudgetAmount((budgetValue / 10000000).toString());
        setBudgetUnit('Crores');
      } else if (budgetValue >= 100000) {
        // Lakhs
        setBudgetAmount((budgetValue / 100000).toString());
        setBudgetUnit('Lakhs');
      } else {
        setBudgetAmount(budgetValue.toString());
        setBudgetUnit('Lakhs');
      }
    }

    setPossession(requirement.preferences.possession || '');
    setFinancingOption(requirement.preferences.financingOption || 'Loan option');
    setIncludeGSTRegistration(requirement.preferences.includeGSTRegistration === 'Yes');
    setIsFormCollapsed(false);

    toast({
      title: 'Editing requirement',
      description: 'Update the form and click Submit to save changes',
    });
  };

  const handleAddNewRequirement = () => {
    setEditingRequirement(null);
    setPropertyType('');
    setConfigurations([]);
    setLocations([]);
    setBudgetAmount('');
    setPossession('');
    setIncludeGSTRegistration(false);
    setIsFormCollapsed(false);

    toast({
      title: 'New requirement',
      description: 'Fill the form to add a new requirement',
    });
  };

  const handleNavigateRequirement = (direction: 'prev' | 'next') => {
    if (savedRequirements.length === 0) return;

    setCurrentRequirementIndex(prev => {
      if (direction === 'next') {
        return (prev + 1) % savedRequirements.length;
      } else {
        return prev === 0 ? savedRequirements.length - 1 : prev - 1;
      }
    });
  };

  // Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handleNavigateRequirement('prev');
      } else if (e.key === 'ArrowRight') {
        handleNavigateRequirement('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [savedRequirements]);

  const handleSaveRequirement = async () => {
    if (!selectedLead) {
      toast({
        title: 'No lead selected',
        description: 'Please select a lead first',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedLead.mobile) {
      toast({
        title: 'No mobile number',
        description: 'Lead must have a mobile number to save requirements',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Convert budget to base unit (assuming Lakhs/Crores)
      let budgetMin = 0;
      let budgetMax = 0;
      if (budgetAmount) {
        const amount = parseFloat(budgetAmount);
        if (budgetUnit === 'Lakhs') {
          budgetMin = amount * 100000;
          budgetMax = amount * 100000;
        } else if (budgetUnit === 'Crores') {
          budgetMin = amount * 10000000;
          budgetMax = amount * 10000000;
        }
      }

      // Save or update requirement to database
      const isEditing = editingRequirement !== null;
      const url = isEditing
        ? `/api/update-requirement/${editingRequirement.id}`
        : '/api/create-requirement';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedLead.mobile, // Use mobile number, not lead ID
          budgetMin,
          budgetMax,
          possession,
          configuration: configurations.join(', '),
          locations: locations.join(', '),
          propertyType,
          financingOption,
          includeGSTRegistration,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save requirement');
      }

      const data = await response.json();

      toast({
        title: editingRequirement ? 'Requirement updated' : 'Requirement saved',
        description: `Saved successfully! Found ${data.totalMatches || 0} matching properties`,
      });

      // Refresh requirements list - use refetchQueries to force immediate refetch
      await queryClient.refetchQueries({ queryKey: ['/api/requirements', selectedLead.mobile] });

      // Reset form
      setPropertyType('');
      setConfigurations([]);
      setLocations([]);
      setBudgetAmount('');
      setPossession('');
      setIncludeGSTRegistration(false);
      setEditingRequirement(null);

    } catch (error) {
      console.error('Error saving requirement:', error);
      toast({
        title: 'Error',
        description: 'Failed to save requirement. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">Pre-Sale Dashboard</h1>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 grid grid-cols-[20rem_1fr_1fr] gap-0 overflow-hidden">

        {/* LEFT PANEL: Leads List */}
        <div className="border-r bg-muted/20 flex flex-col min-h-0">
          <div className="p-4 border-b bg-background space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-leads"
              />
            </div>

            {/* Sort and Filter Controls */}
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="flex-1" data-testid="select-sort">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="flex-1" data-testid="select-filter">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Filter" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Qualified">Qualified</SelectItem>
                  <SelectItem value="Follow Up">Follow Up</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-2">
              {filteredLeads.map((lead: Lead) => (
                <Card
                  key={lead.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedLead?.id === lead.id ? 'ring-2 ring-primary' : ''
                    }`}
                  onClick={() => setSelectedLead(lead)}
                  data-testid={`card-lead-${lead.id}`}
                >
                  <CardContent className="p-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm" data-testid="text-lead-name">{lead.leadName}</p>
                      <p className="text-xs text-muted-foreground" data-testid="text-lead-mobile">{lead.mobile}</p>
                      {lead.email && (
                        <p className="text-xs text-blue-600 font-medium truncate" title={lead.email} data-testid="text-lead-email">
                          📧 {lead.email}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground" data-testid="text-lead-time">
                        {formatDate(lead.createdTime)}
                      </p>
                      {lead.leadStatus && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {lead.leadStatus}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredLeads.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No leads found</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Logout Button */}
          <div className="p-4 border-t bg-background">
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* MIDDLE PANEL: Requirement Collection Form */}
        <div className="border-r bg-background overflow-y-auto">
          {selectedLead ? (
            <div className="h-full flex flex-col">
              <div
                className="p-4 border-b bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setIsFormCollapsed(!isFormCollapsed)}
                data-testid="button-collapse-form"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Requirement Collection</h2>
                    <p className="text-sm text-muted-foreground">
                      For {selectedLead.leadName}
                    </p>
                    {selectedLead.email && (
                      <p className="text-xs text-blue-600 font-medium mt-1">
                        📧 {selectedLead.email}
                      </p>
                    )}
                  </div>
                  {isFormCollapsed ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronUp className="h-5 w-5" />
                  )}
                </div>
              </div>

              {!isFormCollapsed && (
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-6">
                    {/* Property Type */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Property Type:</Label>
                      <RadioGroup value={propertyType} onValueChange={setPropertyType}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Apartment" id="apartment" data-testid="radio-apartment" />
                          <Label htmlFor="apartment" className="font-normal cursor-pointer">Apartment</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Villa" id="villa" data-testid="radio-villa" />
                          <Label htmlFor="villa" className="font-normal cursor-pointer">Villa</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Configuration */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Configuration: (multi selection)</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {configOptions.map((config) => (
                          <div key={config} className="flex items-center space-x-2">
                            <Checkbox
                              id={config}
                              checked={configurations.includes(config)}
                              onCheckedChange={() => toggleConfiguration(config)}
                              data-testid={`checkbox-${config.replace(/\s/g, '-').toLowerCase()}`}
                            />
                            <Label htmlFor={config} className="font-normal cursor-pointer">{config}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Location: (multi selection)</Label>
                      <Popover open={locationPopoverOpen} onOpenChange={setLocationPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={locationPopoverOpen}
                            className="w-full justify-between"
                            data-testid="select-location"
                          >
                            Select location
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput placeholder="Search location..." />
                            <CommandList>
                              <CommandEmpty>No location found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  key="all"
                                  value="All"
                                  onSelect={() => {
                                    handleLocationChange('All');
                                  }}
                                  data-testid="select-location-all"
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${locations.length === allLocations.length ? "opacity-100" : "opacity-0"
                                      }`}
                                  />
                                  All
                                </CommandItem>
                                {allLocations.map((location) => (
                                  <CommandItem
                                    key={location}
                                    value={location}
                                    onSelect={() => {
                                      handleLocationChange(location);
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${locations.includes(location) ? "opacity-100" : "opacity-0"
                                        }`}
                                    />
                                    {location}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {locations.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {locations.map((loc, idx) => (
                            <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                              {loc}
                              <X
                                className="h-3 w-3 cursor-pointer hover:text-destructive"
                                onClick={() => handleLocationRemove(loc)}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Budget Amount */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Budget Amount</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="e.g., 5"
                          value={budgetAmount}
                          onChange={(e) => setBudgetAmount(e.target.value)}
                          className="flex-1"
                          data-testid="input-budget"
                        />
                        <Select value={budgetUnit} onValueChange={setBudgetUnit}>
                          <SelectTrigger className="w-32" data-testid="select-budget-unit">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Lakhs">Lakhs</SelectItem>
                            <SelectItem value="Crores">Crores</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Possession */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Possession:</Label>
                      <Select value={possession} onValueChange={setPossession}>
                        <SelectTrigger data-testid="select-possession">
                          <SelectValue placeholder="Select possession timeline" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ready to Move In">Ready to Move In</SelectItem>
                          <SelectItem value="Within 6 months">Within 6 months</SelectItem>
                          <SelectItem value="6-12 months">6-12 months</SelectItem>
                          <SelectItem value="1-2 years">1-2 years</SelectItem>
                          <SelectItem value="2+ years">2+ years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Financing Option */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Financing Option</Label>
                      <RadioGroup value={financingOption} onValueChange={setFinancingOption}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="OTP" id="otp" data-testid="radio-otp" />
                          <Label htmlFor="otp" className="font-normal cursor-pointer">OTP</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Loan option" id="loan" data-testid="radio-loan" />
                          <Label htmlFor="loan" className="font-normal cursor-pointer">Loan option</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Including GST and Registration */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="gst-registration"
                        checked={includeGSTRegistration}
                        onCheckedChange={(checked) => setIncludeGSTRegistration(checked as boolean)}
                        data-testid="checkbox-gst-registration"
                      />
                      <Label
                        htmlFor="gst-registration"
                        className="text-base font-semibold cursor-pointer"
                      >
                        including GST and Registration
                      </Label>
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleSaveRequirement}
                      className="w-full"
                      data-testid="button-save-requirement"
                    >
                      {editingRequirement ? 'Update Requirement' : 'Submit'}
                    </Button>
                  </div>
                </ScrollArea>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a lead to collect requirements</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Saved Requirements, Notes, Calendar */}
        <div className="bg-background overflow-y-auto">
          {selectedLead ? (
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Saved Requirements */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Saved Requirements</h3>
                    <Button
                      size="sm"
                      onClick={handleAddNewRequirement}
                      data-testid="button-add-new-requirement"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add New
                    </Button>
                  </div>

                  {savedRequirements.length > 0 ? (
                    <>
                      {/* Navigation Controls */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleNavigateRequirement('prev')}
                          disabled={savedRequirements.length <= 1}
                          data-testid="button-prev-requirement"
                        >
                          ← Previous
                        </Button>
                        <span>
                          {currentRequirementIndex + 1} of {savedRequirements.length}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleNavigateRequirement('next')}
                          disabled={savedRequirements.length <= 1}
                          data-testid="button-next-requirement"
                        >
                          Next →
                        </Button>
                      </div>

                      {/* Current Requirement Card */}
                      {savedRequirements[currentRequirementIndex] && (
                        <Card className="border bg-white shadow-sm">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{savedRequirements[currentRequirementIndex].name}</h4>
                                {savedRequirements[currentRequirementIndex].source === 'zoho' && (
                                  <Badge variant="secondary" className="text-xs">From Zoho</Badge>
                                )}
                              </div>
                              {savedRequirements[currentRequirementIndex].source !== 'zoho' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditRequirement(savedRequirements[currentRequirementIndex])}
                                  data-testid="button-edit-requirement"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {/* Budget */}
                              <div className="space-y-1">
                                <p className="font-medium text-muted-foreground">Budget</p>
                                <p className="text-base">{savedRequirements[currentRequirementIndex].preferences.budget || '—'}</p>
                              </div>

                              {/* Property Type */}
                              <div className="space-y-1">
                                <p className="font-medium text-muted-foreground">Property Type</p>
                                <p className="text-base">{savedRequirements[currentRequirementIndex].preferences.propertyType || '—'}</p>
                              </div>

                              {/* Possession Dates */}
                              <div className="space-y-1">
                                <p className="font-medium text-muted-foreground">Possession Dates</p>
                                <p className="text-base">{savedRequirements[currentRequirementIndex].preferences.possession || '—'}</p>
                              </div>

                              {/* Location */}
                              <div className="space-y-1">
                                <p className="font-medium text-muted-foreground">Location</p>
                                <p className="text-base">{savedRequirements[currentRequirementIndex].preferences.location || '—'}</p>
                              </div>

                              {/* Configuration */}
                              <div className="space-y-1">
                                <p className="font-medium text-muted-foreground">Configuration</p>
                                <p className="text-base">{savedRequirements[currentRequirementIndex].preferences.configuration || '—'}</p>
                              </div>

                              {/* Property Size */}
                              <div className="space-y-1">
                                <p className="font-medium text-muted-foreground">Property Size</p>
                                <p className="text-base">{savedRequirements[currentRequirementIndex].preferences.propertySize || '—'}</p>
                              </div>

                              {/* OTP/Loan */}
                              <div className="space-y-1">
                                <p className="font-medium text-muted-foreground">OTP/Loan</p>
                                <p className="text-base">{savedRequirements[currentRequirementIndex].preferences.financingOption || '—'}</p>
                              </div>

                              {/* including GST and Registration */}
                              <div className="space-y-1">
                                <p className="font-medium text-muted-foreground">including GST and Registration</p>
                                <p className="text-base">
                                  {savedRequirements[currentRequirementIndex].preferences.includeGSTRegistration || '—'}
                                </p>
                              </div>

                              {/* MatchedPropertyCount */}
                              <div className="space-y-1 col-span-2">
                                <p className="font-medium text-muted-foreground">Matched Property Count</p>
                                <p className="text-base font-semibold text-primary">
                                  {savedRequirements[currentRequirementIndex].matchedProperties?.length ||
                                    savedRequirements[currentRequirementIndex].preferences?.matchedPropertyCount ||
                                    '—'}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="p-6 text-center text-muted-foreground">
                        <p className="text-sm">No saved requirements yet</p>
                        <p className="text-xs mt-1">Click "Add New" to create your first requirement</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Notes</h3>
                  <p className="text-xs text-muted-foreground">Auto-saved</p>
                  <Textarea
                    placeholder="Add notes about this lead..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    data-testid="textarea-notes"
                  />
                </div>

                {/* Calendar Booking */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Calendar Booking</h3>
                  <ExpertScheduling
                    clientId={selectedLead.id || selectedLead.mobile}
                    clientName={selectedLead.leadName}
                  />
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a lead to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
