import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, ArrowUpDown, LogOut, Plus, X, ChevronRight, Check, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Lead {
  id: string;
  leadName: string;
  mobile: string;
  email: string;
  createdTime: string;
  leadStatus?: string;
}

interface Requirement {
  id: number;
  name: string;
  source?: 'zoho' | 'supabase';
  preferences: {
    budget?: string;
    location?: string;
    possession?: string;
    minBudget?: string;
    maxBudget?: string;
    configuration?: string;
    propertyType?: string;
    budgetMin?: string;
    budgetMax?: string;
  };
  matchedProperties?: Property[];
  matched_properties?: Property[];
  createdAt: string;
}

interface PropertyConfiguration {
  id?: string;
  bhk?: string;
  facing?: string;
  baseprojectprice?: number;
  sqfeet?: string;
  sqyard?: string;
  carpetarea?: string;
  superbuiltuparea?: string;
}

interface Property {
  id?: string;
  ProjectName?: string;
  projectname?: string;
  AreaName?: string;
  areaname?: string;
  BHK?: string;
  bhk?: string;
  'Base Project Price'?: number;
  baseprojectprice?: number;
  'SQ FEET'?: string;
  sqft?: string;
  sqfeet?: string;
  sqyard?: string;
  BuilderName?: string;
  buildername?: string;
  Possession_Date?: string;
  possession_date?: string;
  Facing?: string;
  facing?: string;
  property_type?: string;
  RERA_Number?: string;
  rera_number?: string;
  price_per_sft?: number;
  communitytype?: string;
  total_land_area?: string;
  total_number_of_units?: string;
  open_space?: string;
  carpet_area_percentage?: string;
  floor_to_ceiling_height?: string;
  powerbackup?: string;
  ground_vehicle_movement?: string;
  main_door_height?: string;
  projectbrochure?: string;
  pricesheet_link?: string;
  projectlocation?: string;
  GRID_Score?: string;
  number_of_floors?: string;
  construction_material?: string;
  uds?: string;
  configurations?: PropertyConfiguration[];
}

export default function ExpertViewDashboard() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('date-desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedConfigurations, setSelectedConfigurations] = useState<Map<string, PropertyConfiguration & { propertyId: string, propertyName: string, property: Property }>>(new Map());
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const { toast } = useToast();

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

  const { data: requirementsData, refetch: refetchRequirements } = useQuery({
    queryKey: ['/api/requirements', selectedLead?.mobile],
    queryFn: async () => {
      if (!selectedLead?.mobile) return { requirements: [] };
      const response = await fetch(`/api/requirements/${encodeURIComponent(selectedLead.mobile)}`);
      if (!response.ok) throw new Error('Failed to fetch requirements');
      return response.json();
    },
    enabled: !!selectedLead?.mobile,
  });

  const requirements: Requirement[] = requirementsData?.requirements || [];

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

  const getPropertyName = (prop: Property) => prop.ProjectName || prop.projectname || 'N/A';
  const getPropertyArea = (prop: Property) => prop.AreaName || prop.areaname || 'N/A';
  const getPropertyBHK = (prop: Property) => prop.BHK || prop.bhk || 'N/A';
  const getPropertyPrice = (prop: Property) => {
    const price = prop['Base Project Price'] || prop.baseprojectprice;
    return price ? `₹${(price / 10000000).toFixed(2)} Cr` : 'N/A';
  };
  const getPropertySqft = (prop: Property) => {
    // Check if property has configurations array and get sqft from first config
    if (prop.configurations && prop.configurations.length > 0) {
      return prop.configurations[0].sqfeet || prop.configurations[0].sqyard || 'N/A';
    }
    // Fallback to property-level fields
    return prop['SQ FEET'] || prop.sqft || prop.sqfeet || 'N/A';
  };
  const getPropertyBuilder = (prop: Property) => prop.BuilderName || prop.buildername || 'N/A';
  const getPropertyPossession = (prop: Property) => prop.Possession_Date || prop.possession_date || 'N/A';
  const getPropertyFacing = (prop: Property) => prop.Facing || prop.facing || 'N/A';

  const getPropertyId = (prop: Property, index: number) => {
    return prop.id || prop.ProjectName || prop.projectname || `property-${index}`;
  };

  const handleConfigurationSelect = (propertyId: string, propertyName: string, config: PropertyConfiguration, property: Property) => {
    const newSelected = new Map(selectedConfigurations);
    
    // Check if this property already has a selection
    if (newSelected.has(propertyId)) {
      // If clicking the same config, deselect it
      const existing = newSelected.get(propertyId);
      if (existing?.id === config.id) {
        newSelected.delete(propertyId);
      } else {
        // Otherwise, update to the new config
        newSelected.set(propertyId, { ...config, propertyId, propertyName, property });
      }
    } else {
      // Add new selection
      newSelected.set(propertyId, { ...config, propertyId, propertyName, property });
    }
    
    setSelectedConfigurations(newSelected);
  };

  const togglePropertyExpansion = (propertyId: string) => {
    const newExpanded = new Set(expandedProperties);
    if (newExpanded.has(propertyId)) {
      newExpanded.delete(propertyId);
    } else {
      newExpanded.add(propertyId);
    }
    setExpandedProperties(newExpanded);
  };

  const handleCompare = () => {
    if (selectedConfigurations.size < 3) {
      toast({
        title: 'Select more configurations',
        description: 'Please select at least 3 property configurations to compare',
        variant: 'destructive',
      });
      return;
    }
    setShowCompareModal(true);
  };

  const matchedProperties = selectedRequirement?.matchedProperties || selectedRequirement?.matched_properties || [];
  
  // DEBUG: Log configurations to see what backend is sending
  if (matchedProperties.length > 0 && matchedProperties[0]) {
    console.log('🔍 First property:', matchedProperties[0]);
    console.log('🔍 Has configurations?', !!matchedProperties[0].configurations);
    console.log('🔍 Configurations length:', matchedProperties[0].configurations?.length);
    console.log('🔍 Sample property with most configs:', 
      matchedProperties.reduce((max, p) => 
        (p.configurations?.length || 0) > (max.configurations?.length || 0) ? p : max, 
        matchedProperties[0]
      )
    );
  }
  
  const selectedConfigurationsForCompare = Array.from(selectedConfigurations.values());

  const handleRequirementClick = (requirement: Requirement) => {
    console.log('🎯 REQUIREMENT CLICKED:', requirement);
    console.log('🎯 Matched properties:', requirement.matchedProperties || requirement.matched_properties);
    setSelectedRequirement(requirement);
    setSelectedConfigurations(new Map());
  };

  const [refreshingProperty, setRefreshingProperty] = useState<string | null>(null);

  const handleRefreshPropertyConfigs = async (projectName: string) => {
    if (!selectedRequirement || !selectedLead) return;

    setRefreshingProperty(projectName);
    try {
      const response = await fetch(`/api/refresh-property-configs/${selectedRequirement.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedLead.mobile,
          projectName: projectName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh property configurations');
      }

      const data = await response.json();

      toast({
        title: 'Configurations refreshed',
        description: `Found ${data.totalConfigs} matching configurations for ${projectName}`,
      });

      // Refresh requirements list to get updated configurations
      await refetchRequirements();
      
    } catch (error) {
      console.error('Error refreshing property configurations:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh configurations. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRefreshingProperty(null);
    }
  };
  
  // DEBUG: Log whenever selected requirement changes
  useEffect(() => {
    if (selectedRequirement) {
      const props = selectedRequirement.matchedProperties || selectedRequirement.matched_properties || [];
      console.log('🔥 SELECTED REQUIREMENT CHANGED');
      console.log('🔥 Total properties:', props.length);
      if (props.length > 0) {
        console.log('🔥 First property FULL DATA:', JSON.stringify(props[0], null, 2));
        console.log('🔥 First property configurations:', props[0].configurations);
      }
    }
  }, [selectedRequirement]);

  const handleBackToRequirements = () => {
    setSelectedRequirement(null);
    setSelectedConfigurations(new Map());
  };

  const handleAddRequirement = () => {
    if (!selectedLead) {
      toast({
        title: 'No lead selected',
        description: 'Please select a lead first',
        variant: 'destructive',
      });
      return;
    }
    
    window.location.href = '/pre-sale-dashboard';
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">Expert Dashboard</h1>
      </div>

      <div className="flex-1 grid overflow-hidden" style={{
        gridTemplateColumns: selectedRequirement 
          ? '20rem 12rem 1fr' 
          : '20rem 1fr 0fr',
        transition: 'grid-template-columns 0.3s ease-in-out'
      }}>
        
        {/* LEFT PANEL: Leads List */}
        <div className="border-r bg-muted/20 flex flex-col min-h-0">
          <div className="p-4 border-b bg-background space-y-3">
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
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedLead?.id === lead.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedLead(lead)}
                  data-testid={`card-lead-${lead.id}`}
                >
                  <CardContent className="p-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm" data-testid="text-lead-name">{lead.leadName}</p>
                      <p className="text-xs text-muted-foreground" data-testid="text-lead-mobile">{lead.mobile}</p>
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

        {/* MIDDLE PANEL: Requirements List */}
        <div className="border-r bg-background overflow-hidden flex flex-col" style={{
          transition: 'all 0.3s ease-in-out'
        }}>
          {selectedLead ? (
            <>
              <div className="p-4 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Requirements</h2>
                    <p className="text-sm text-muted-foreground">For {selectedLead.leadName}</p>
                  </div>
                  {selectedRequirement && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToRequirements}
                      data-testid="button-back-to-requirements"
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" />
                    </Button>
                  )}
                </div>
              </div>
              
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-3 space-y-2">
                  {requirements.map((req) => (
                    <Card
                      key={req.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedRequirement?.id === req.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleRequirementClick(req)}
                      data-testid={`card-requirement-${req.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-sm">{req.name}</p>
                            {req.source === 'zoho' && (
                              <Badge variant="secondary" className="text-xs">Zoho</Badge>
                            )}
                          </div>
                          <div className="text-xs space-y-1">
                            <p className="text-muted-foreground">
                              <span className="font-medium">Budget:</span> {req.preferences.budget || req.preferences.budgetMin || 'N/A'}
                            </p>
                            <p className="text-muted-foreground">
                              <span className="font-medium">Config:</span> {req.preferences.configuration || 'N/A'}
                            </p>
                            <p className="text-muted-foreground">
                              <span className="font-medium">Location:</span> {req.preferences.location || 'N/A'}
                            </p>
                            <p className="text-primary font-semibold">
                              {(req.matchedProperties?.length || req.matched_properties?.length || 0)} matches
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {requirements.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No requirements found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="p-3 border-t bg-background">
                <Button 
                  className="w-full"
                  variant="outline"
                  onClick={handleAddRequirement}
                  data-testid="button-add-requirement"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Requirement
                </Button>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a lead to view requirements</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Properties Table */}
        <div className="bg-background overflow-hidden flex flex-col">
          {selectedRequirement ? (
            <>
              <div className="p-4 border-b bg-muted/20">
                <div>
                  <h2 className="text-lg font-semibold">Matched Properties</h2>
                  <p className="text-sm text-muted-foreground">
                    {matchedProperties.length} properties found
                  </p>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Property Name</TableHead>
                      <TableHead>Builder</TableHead>
                      <TableHead>BHK</TableHead>
                      <TableHead>Facing</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Sqft</TableHead>
                      <TableHead>Possession</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchedProperties.map((property, index) => {
                      const propId = getPropertyId(property, index);
                      const hasMultipleConfigs = property.configurations && property.configurations.length > 1;
                      const isExpanded = expandedProperties.has(propId);
                      
                      return (
                        <>
                          <TableRow key={propId} data-testid={`row-property-${index}`} className={hasMultipleConfigs ? 'cursor-pointer hover:bg-muted/50' : ''}>
                            <TableCell></TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {hasMultipleConfigs && (
                                  <button 
                                    onClick={() => togglePropertyExpansion(propId)}
                                    className="p-1 hover:bg-muted rounded"
                                  >
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </button>
                                )}
                                <span>{getPropertyName(property)}</span>
                                {hasMultipleConfigs && (
                                  <Badge variant="secondary" className="text-xs">
                                    {property.configurations.length} configs
                                  </Badge>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRefreshPropertyConfigs(getPropertyName(property));
                                  }}
                                  disabled={refreshingProperty === getPropertyName(property)}
                                  className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50"
                                  title="Refresh configurations for this property"
                                  data-testid={`button-refresh-property-${index}`}
                                >
                                  <RefreshCw 
                                    className={`h-4 w-4 text-muted-foreground hover:text-foreground ${
                                      refreshingProperty === getPropertyName(property) ? 'animate-spin' : ''
                                    }`} 
                                  />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell>{getPropertyBuilder(property)}</TableCell>
                            <TableCell>{getPropertyBHK(property)}</TableCell>
                            <TableCell>{getPropertyFacing(property)}</TableCell>
                            <TableCell>{getPropertyPrice(property)}</TableCell>
                            <TableCell>{getPropertySqft(property)}</TableCell>
                            <TableCell>{getPropertyPossession(property)}</TableCell>
                          </TableRow>
                          
                          {/* Show configurations as sub-rows with radio buttons */}
                          {hasMultipleConfigs && isExpanded && property.configurations.map((config, configIndex) => {
                            const isSelected = selectedConfigurations.has(propId) && selectedConfigurations.get(propId)?.id === config.id;
                            return (
                              <TableRow 
                                key={`${propId}-config-${configIndex}`} 
                                className={`text-sm cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-primary/10' : 'bg-muted/30'}`}
                                onClick={() => handleConfigurationSelect(propId, getPropertyName(property), config, property)}
                                data-testid={`row-config-${index}-${configIndex}`}
                              >
                                <TableCell className="text-center">
                                  <input
                                    type="radio"
                                    name={`property-${propId}`}
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="h-4 w-4 cursor-pointer"
                                    data-testid={`radio-config-${index}-${configIndex}`}
                                  />
                                </TableCell>
                                <TableCell className="pl-12 text-muted-foreground">└ Config {configIndex + 1}</TableCell>
                                <TableCell></TableCell>
                                <TableCell>{config.bhk || 'N/A'}</TableCell>
                                <TableCell>{config.facing || 'N/A'}</TableCell>
                                <TableCell>
                                  {config.baseprojectprice ? `₹${(config.baseprojectprice / 10000000).toFixed(2)} Cr` : 'N/A'}
                                </TableCell>
                                <TableCell>{config.sqfeet || config.sqyard || 'N/A'}</TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            );
                          })}
                        </>
                      );
                    })}
                    
                    {matchedProperties.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No properties matched for this requirement
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="p-4 border-t bg-background">
                <Button 
                  className="w-full"
                  onClick={handleCompare}
                  disabled={selectedConfigurations.size < 3}
                  data-testid="button-compare"
                >
                  Compare {selectedConfigurations.size > 0 && `(${selectedConfigurations.size})`}
                </Button>
                {selectedConfigurations.size > 0 && selectedConfigurations.size < 3 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Select at least 3 configurations to compare
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Compare Modal */}
      <Dialog open={showCompareModal} onOpenChange={setShowCompareModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Property Comparison</DialogTitle>
          </DialogHeader>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Builder Name</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.buildername || config.property?.BuilderName || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Project Name</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3 font-semibold">{config.propertyName}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Area Name</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.areaname || config.property?.AreaName || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Facing</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.facing || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">BHK</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.bhk || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">SQ Feet</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.sqfeet || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">SQ Yard</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.sqyard || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Price per SFT</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.price_per_sft ? `₹${config.property.price_per_sft}` : 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Possession Date</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.possession_date || config.property?.Possession_Date || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Base Project Price</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3 font-semibold text-primary">
                      {config.baseprojectprice ? `₹${(config.baseprojectprice / 10000000).toFixed(2)} Cr` : 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Community Type</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.communitytype || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Total Land Area</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.total_land_area || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Total No of Units</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.total_number_of_units || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Open Percentage</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.open_space || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Carpet Area %</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.carpet_area_percentage || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Floor to Ceiling</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.floor_to_ceiling_height || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Power Backup</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.powerbackup || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Ground Vehicle Movement</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.ground_vehicle_movement || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Main Door Height</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.main_door_height || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Brochure Link</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">
                      {config.property?.projectbrochure ? (
                        <a href={config.property.projectbrochure} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          View Brochure
                        </a>
                      ) : 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Pricesheet Link</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">
                      {config.property?.pricesheet_link ? (
                        <a href={config.property.pricesheet_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          View Pricesheet
                        </a>
                      ) : 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Site Location</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.projectlocation || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">GRID Score</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3 font-semibold">{config.property?.GRID_Score || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">No of Floors</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.number_of_floors || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Construction Material</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.construction_material || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">UDS</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.uds || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">RERA Number</td>
                  {selectedConfigurationsForCompare.map((config, idx) => (
                    <td key={idx} className="p-3">{config.property?.rera_number || config.property?.RERA_Number || 'N/A'}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCompareModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
