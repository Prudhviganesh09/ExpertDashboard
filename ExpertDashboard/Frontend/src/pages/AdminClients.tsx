import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, ArrowUpDown, LogOut, Plus, X, ChevronRight, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
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
  BuilderName?: string;
  buildername?: string;
  Possession_Date?: string;
  possession_date?: string;
  Facing?: string;
  facing?: string;
  property_type?: string;
  RERA_Number?: string;
}

export default function AdminClients() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('date-desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const [showCompareModal, setShowCompareModal] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isAdmin = () => {
    const userData = localStorage.getItem('userData');
    if (!userData) return false;

    try {
      const user = JSON.parse(userData);
      return user.email === "admin@relai.world" || user.role === "admin";
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!isAdmin()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate("/clients");
      return;
    }

  }, [navigate, toast]);

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

  const { data: requirementsData } = useQuery({
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
  const getPropertySqft = (prop: Property) => prop['SQ FEET'] || prop.sqft || 'N/A';
  const getPropertyBuilder = (prop: Property) => prop.BuilderName || prop.buildername || 'N/A';
  const getPropertyPossession = (prop: Property) => prop.Possession_Date || prop.possession_date || 'N/A';
  const getPropertyFacing = (prop: Property) => prop.Facing || prop.facing || 'N/A';

  const getPropertyId = (prop: Property, index: number) => {
    return prop.id || prop.ProjectName || prop.projectname || `property-${index}`;
  };

  const handlePropertySelect = (propertyId: string) => {
    const newSelected = new Set(selectedProperties);
    if (newSelected.has(propertyId)) {
      newSelected.delete(propertyId);
    } else {
      newSelected.add(propertyId);
    }
    setSelectedProperties(newSelected);
  };

  const handleCompare = () => {
    if (selectedProperties.size < 3) {
      toast({
        title: 'Select more properties',
        description: 'Please select at least 3 properties to compare',
        variant: 'destructive',
      });
      return;
    }
    setShowCompareModal(true);
  };

  const matchedProperties = selectedRequirement?.matchedProperties || selectedRequirement?.matched_properties || [];
  const selectedPropertiesForCompare = matchedProperties.filter((prop, idx) =>
    selectedProperties.has(getPropertyId(prop, idx))
  );

  const handleRequirementClick = (requirement: Requirement) => {
    setSelectedRequirement(requirement);
    setSelectedProperties(new Set());
  };

  const handleBackToRequirements = () => {
    setSelectedRequirement(null);
    setSelectedProperties(new Set());
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
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage client-agent assignments with precision</p>
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
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedLead?.id === lead.id ? 'ring-2 ring-primary' : ''
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
                      className={`cursor-pointer transition-all hover:shadow-md ${selectedRequirement?.id === req.id ? 'ring-2 ring-primary' : ''
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
                <h2 className="text-lg font-semibold">Matched Properties</h2>
                <p className="text-sm text-muted-foreground">
                  {matchedProperties.length} properties found
                </p>
              </div>

              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedProperties.size === matchedProperties.length && matchedProperties.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProperties(new Set(matchedProperties.map((p, i) => getPropertyId(p, i))));
                            } else {
                              setSelectedProperties(new Set());
                            }
                          }}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
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
                      return (
                        <TableRow key={propId} data-testid={`row-property-${index}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedProperties.has(propId)}
                              onCheckedChange={() => handlePropertySelect(propId)}
                              data-testid={`checkbox-property-${index}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{getPropertyName(property)}</TableCell>
                          <TableCell>{getPropertyBuilder(property)}</TableCell>
                          <TableCell>{getPropertyBHK(property)}</TableCell>
                          <TableCell>{getPropertyFacing(property)}</TableCell>
                          <TableCell>{getPropertyPrice(property)}</TableCell>
                          <TableCell>{getPropertySqft(property)}</TableCell>
                          <TableCell>{getPropertyPossession(property)}</TableCell>
                        </TableRow>
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
                  disabled={selectedProperties.size < 3}
                  data-testid="button-compare"
                >
                  Compare {selectedProperties.size > 0 && `(${selectedProperties.size})`}
                </Button>
                {selectedProperties.size > 0 && selectedProperties.size < 3 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Select at least 3 properties to compare
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
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold bg-muted/50 sticky left-0">Field</th>
                  {selectedPropertiesForCompare.map((prop, idx) => (
                    <th key={idx} className="text-left p-3 font-semibold bg-muted/50 min-w-[200px]">
                      {getPropertyName(prop)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Builder Name</td>
                  {selectedPropertiesForCompare.map((prop, idx) => (
                    <td key={idx} className="p-3">{getPropertyBuilder(prop)}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Location</td>
                  {selectedPropertiesForCompare.map((prop, idx) => (
                    <td key={idx} className="p-3">{getPropertyArea(prop)}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">BHK</td>
                  {selectedPropertiesForCompare.map((prop, idx) => (
                    <td key={idx} className="p-3">{getPropertyBHK(prop)}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Facing</td>
                  {selectedPropertiesForCompare.map((prop, idx) => (
                    <td key={idx} className="p-3">{getPropertyFacing(prop)}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Base Project Price</td>
                  {selectedPropertiesForCompare.map((prop, idx) => (
                    <td key={idx} className="p-3 font-semibold text-primary">{getPropertyPrice(prop)}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Sqft Size</td>
                  {selectedPropertiesForCompare.map((prop, idx) => (
                    <td key={idx} className="p-3">{getPropertySqft(prop)}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Possession Date</td>
                  {selectedPropertiesForCompare.map((prop, idx) => (
                    <td key={idx} className="p-3">{getPropertyPossession(prop)}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">Property Type</td>
                  {selectedPropertiesForCompare.map((prop, idx) => (
                    <td key={idx} className="p-3">{prop.property_type || 'N/A'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium bg-muted/20 sticky left-0">RERA Number</td>
                  {selectedPropertiesForCompare.map((prop, idx) => (
                    <td key={idx} className="p-3">{prop.RERA_Number || 'N/A'}</td>
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

    </div >
  );
}
