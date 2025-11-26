import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MapPin,
  Phone,
  Mail,
  Calendar,
  List,
  LayoutGrid,
  X,
  Plus,
  Shield,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/config/api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const getPriorityColor = (priority) => {
  switch (priority) {
    case "High":
      return "destructive";
    case "Medium":
      return "warning";
    case "Low":
      return "secondary";
    default:
      return "secondary";
  }
};

const getClientProgress = (clientId) => {
  // Mock logic - you can adapt this based on your data
  if (clientId.endsWith("173")) return "Site Visit"; // Example based on Rishi's number
  return "Meeting";
};

// Add this function after the imports and before the Clients component
const calculatePossessionTimeline = (possessionDate: string): string => {
  if (!possessionDate || possessionDate.trim() === "") {
    return "Not specified";
  }

  // Handle special cases first
  const upperCaseDate = possessionDate.toUpperCase().trim();
  if (upperCaseDate === "RTM" || upperCaseDate === "READY TO MOVE IN") {
    return "Ready To Move In";
  }

  try {
    const currentDate = new Date();
    let targetDate: Date;

    // Handle year-only format (e.g., "2025", "2026")
    if (possessionDate.match(/^\d{4}$/)) {
      const year = parseInt(possessionDate);
      const currentYear = currentDate.getFullYear();

      if (year <= currentYear) {
        return "Ready To Move In";
      } else if (year === currentYear + 1) {
        return "6-12 months";
      } else if (year === currentYear + 2) {
        return "1-2 years";
      } else {
        return "More than 2 years";
      }
    }

    // Handle different date formats
    if (possessionDate.includes("/")) {
      // Format: DD/MM/YY or DD/MM/YYYY (based on database format like "01/09/28")
      const parts = possessionDate.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const yearPart = parts[2];

        if (yearPart.length === 2) {
          // YY format - interpret as 20YY (e.g., "28" = 2028)
          const fullYear = 2000 + parseInt(yearPart);
          targetDate = new Date(fullYear, month - 1, day);
        } else if (yearPart.length === 4) {
          // YYYY format
          targetDate = new Date(parseInt(yearPart), month - 1, day);
        } else {
          return possessionDate; // Return as is if format is unclear
        }
      } else {
        return possessionDate; // Return as is if format is unclear
      }
    } else if (possessionDate.includes("-")) {
      // Format: YYYY-MM-DD or DD-MM-YYYY
      const parts = possessionDate.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD format
          targetDate = new Date(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2]),
          );
        } else {
          // DD-MM-YYYY format
          targetDate = new Date(
            parseInt(parts[2]),
            parseInt(parts[1]) - 1,
            parseInt(parts[0]),
          );
        }
      } else {
        return possessionDate; // Return as is if format is unclear
      }
    } else {
      // Try parsing as is
      targetDate = new Date(possessionDate);
      if (isNaN(targetDate.getTime())) {
        return possessionDate; // Return as is if parsing fails
      }
    }

    // Calculate difference in months
    const diffTime = targetDate.getTime() - currentDate.getTime();
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month

    if (diffMonths <= 0) {
      return "Ready To Move In";
    } else if (diffMonths <= 6) {
      return "3-6 months";
    } else if (diffMonths <= 12) {
      return "6-12 months";
    } else if (diffMonths <= 24) {
      return "1-2 years";
    } else {
      return "More than 2 years";
    }
  } catch (error) {
    console.error("Error calculating possession timeline:", error);
    return possessionDate; // Return original value if calculation fails
  }
};

// Add Requirement Modal Component
function AddRequirementModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    budgetMin: "",
    budgetMax: "",
    possession: "",
    configuration: "",
    locations: "",
    propertyType: "",
    communityType: "",
    facing: "",
    buildingType: "",
    floorMin: "",
    floorMax: "",
    sizeMin: "",
    sizeMax: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("=== FORM SUBMIT DEBUG ===");
    console.log("Form submitted with data:", formData);
    console.log("Form data type:", typeof formData);
    console.log("Form data keys:", Object.keys(formData));
    console.log("onSubmit function:", typeof onSubmit);

    // Add a simple alert to confirm the function is being called
    alert("Form submitted! Check console for details.");

    // Add a try-catch to see if there are any errors
    try {
      onSubmit(formData);
      onClose();
      setFormData({
        budgetMin: "",
        budgetMax: "",
        possession: "",
        configuration: "",
        locations: "",
        propertyType: "",
        communityType: "",
        facing: "",
        buildingType: "",
        floorMin: "",
        floorMax: "",
        sizeMin: "",
        sizeMax: "",
      });
    } catch (error) {
      console.error("Error in handleSubmit:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[600px]"
        aria-describedby="requirement-form-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Add New Requirement</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div id="requirement-form-description" className="sr-only">
          Form to add new property requirement with budget, configuration,
          location, and other preferences.
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          noValidate
          onChange={() => {
            console.log("=== FORM CHANGED ===");
            console.log("Current form data:", formData);
          }}
        >
          {/* Budget Range */}
          <div className="space-y-2">
            <Label htmlFor="budgetMin">Budget Range</Label>
            <div className="flex gap-2">
              <Input
                id="budgetMin"
                placeholder="Min budget"
                value={formData.budgetMin}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    budgetMin: e.target.value,
                  }))
                }
              />
              <Input
                id="budgetMax"
                placeholder="Max budget"
                value={formData.budgetMax}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    budgetMax: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          {/* Possession Timeline */}
          <div className="space-y-2">
            <Label htmlFor="possession">Possession Timeline</Label>
            <Input
              id="possession"
              placeholder="When do you need possession?"
              value={formData.possession}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, possession: e.target.value }))
              }
            />
          </div>

          {/* Property Configuration */}
          <div className="space-y-2">
            <Label htmlFor="configuration">Property Configuration</Label>
            <Select
              value={formData.configuration}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, configuration: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select property configuration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1BHK">1 BHK</SelectItem>
                <SelectItem value="2BHK">2 BHK</SelectItem>
                <SelectItem value="3BHK">3 BHK</SelectItem>
                <SelectItem value="4BHK">4 BHK</SelectItem>
                <SelectItem value="5BHK+">5+ BHK</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preferred Locations */}
          <div className="space-y-2">
            <Label htmlFor="locations">Preferred Locations</Label>
            <Input
              id="locations"
              placeholder="Click to select locations"
              value={formData.locations}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, locations: e.target.value }))
              }
            />
          </div>

          {/* Property Type */}
          <div className="space-y-2">
            <Label htmlFor="propertyType">Property Type</Label>
            <Select
              value={formData.propertyType}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, propertyType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select property type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Apartment">Apartment</SelectItem>
                <SelectItem value="Villa">Villa</SelectItem>
                <SelectItem value="Independent House">
                  Independent House
                </SelectItem>
                <SelectItem value="Plot">Plot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Community Type */}
          <div className="space-y-2">
            <Label htmlFor="communityType">Community Type</Label>
            <Select
              value={formData.communityType}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, communityType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select community type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gated">Gated Community</SelectItem>
                <SelectItem value="Semi-Gated">Semi-Gated</SelectItem>
                <SelectItem value="Standalone">Standalone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Facing Preference */}
          <div className="space-y-2">
            <Label htmlFor="facing">Facing Preference</Label>
            <Select
              value={formData.facing}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, facing: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select facing direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="North">North</SelectItem>
                <SelectItem value="South">South</SelectItem>
                <SelectItem value="East">East</SelectItem>
                <SelectItem value="West">West</SelectItem>
                <SelectItem value="North-East">North-East</SelectItem>
                <SelectItem value="North-West">North-West</SelectItem>
                <SelectItem value="South-East">South-East</SelectItem>
                <SelectItem value="South-West">South-West</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Building Type */}
          <div className="space-y-2">
            <Label htmlFor="buildingType">Building Type</Label>
            <Select
              value={formData.buildingType}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, buildingType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select building type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low Rise">Low Rise</SelectItem>
                <SelectItem value="High Rise">High Rise</SelectItem>
                <SelectItem value="Mid Rise">Mid Rise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Floor Preference */}
          <div className="space-y-2">
            <Label htmlFor="floorMin">Floor Preference</Label>
            <div className="flex gap-2">
              <Input
                id="floorMin"
                placeholder="Min floor"
                value={formData.floorMin}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, floorMin: e.target.value }))
                }
              />
              <Input
                id="floorMax"
                placeholder="Max floor"
                value={formData.floorMax}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, floorMax: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Size Range */}
          <div className="space-y-2">
            <Label htmlFor="sizeMin">Size Range (sq ft)</Label>
            <div className="flex gap-2">
              <Input
                id="sizeMin"
                placeholder="Min size"
                value={formData.sizeMin}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sizeMin: e.target.value }))
                }
              />
              <Input
                id="sizeMax"
                placeholder="Max size"
                value={formData.sizeMax}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sizeMax: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                console.log("=== TEST BUTTON CLICKED ===");
                console.log("Current form data:", formData);
                onSubmit(formData);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Test Submit
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={(e) => {
                console.log("=== SUBMIT BUTTON CLICKED ===");
                console.log("Button clicked, form should submit");
                console.log("Event type:", e.type);
                console.log("Event target:", e.target);

                // Also try to submit the form manually
                const target = e.target as HTMLElement;
                const form = target.closest("form");
                if (form) {
                  console.log("Found form, submitting manually");
                  form.dispatchEvent(
                    new Event("submit", { bubbles: true, cancelable: true }),
                  );
                } else {
                  console.log("No form found");
                }
              }}
            >
              Create Requirement
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Component to display matching properties
function MatchingPropertiesModal({ isOpen, onClose, properties }) {
  if (!isOpen || !properties || properties.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Matching Properties ({properties.length})</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {properties.map((property, index) => (
            <Card key={property._id || index} className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {property.ProjectName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {property.AreaName}
                    </p>
                  </div>
                  <Badge variant="outline">{property.Configuration}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Base Price:</span>
                    <p className="text-muted-foreground">
                      ₹{property.BaseProjectPrice}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Size:</span>
                    <p className="text-muted-foreground">
                      {property.Size} sq ft
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Builder:</span>
                    <p className="text-muted-foreground">
                      {property.BuilderName}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">RERA:</span>
                    <p className="text-muted-foreground">
                      {property.RERA_Number}
                    </p>
                  </div>
                </div>

                {property.configurations &&
                  property.configurations.length > 0 && (
                    <div>
                      <span className="font-medium text-sm">
                        Available Configurations:
                      </span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {property.configurations
                          .slice(0, 5)
                          .map((config, configIndex) => (
                            <Badge
                              key={configIndex}
                              variant="secondary"
                              className="text-xs"
                            >
                              {config.type} - {config.sizeRange} sq ft - ₹
                              {config.BaseProjectPrice}
                            </Badge>
                          ))}
                        {property.configurations.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{property.configurations.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                <div className="flex justify-between items-center pt-2 border-t">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>🏥 {property.hospitals_count} Hospitals</span>
                    <span>🏫 {property.schools_count} Schools</span>
                    <span>🛒 {property.shopping_malls_count} Malls</span>
                    <span>🍽️ {property.restaurants_count} Restaurants</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">GRID Score</div>
                    <div className="text-lg font-bold text-blue-600">
                      {property.GRID_Score}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientPriorities, setClientPriorities] = useState({});
  const [shortlistedCounts, setShortlistedCounts] = useState({});
  const [view, setView] = useState("grid");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState(null);
  const [siteVisitFilter, setSiteVisitFilter] = useState(null);
  const [addRequirementModalOpen, setAddRequirementModalOpen] = useState(false);
  const [matchingPropertiesModalOpen, setMatchingPropertiesModalOpen] =
    useState(false);
  const [matchingProperties, setMatchingProperties] = useState([]);
  const [agents, setAgents] = useState([]);
  const [clientAgentAssignments, setClientAgentAssignments] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [isPreSaleUser, setIsPreSaleUser] = useState(false);

  useEffect(() => {
    try {
      const userData = localStorage.getItem('userData');
      if (!userData) return;

      const user = JSON.parse(userData);
      const normalizedEmail = (user.email || '').toLowerCase();
      const preSaleEmails = [
        "vaishnavig@relai.world",
        "angaleenaj@relai.world",
        "angelinak@relai.world",
        "subscriptions@relai.world",
        "sindhua@relai.world",
        "sindhu@relai.world",
      ];

      if (user.role === 'pre-sale' || preSaleEmails.includes(normalizedEmail)) {
        setIsPreSaleUser(true);
      }
    } catch (error) {
      console.error('Error determining pre-sale status:', error);
    }
  }, []);

  useEffect(() => {
    if (isPreSaleUser) {
      navigate('/pre-sale-dashboard', { replace: true });
    }
  }, [isPreSaleUser, navigate]);

  // Property status functionality
  const getClientStatusKey = (clientId: string) => `client_${clientId}_status`;

  const saveClientStatus = (clientId: string, status: string) => {
    try {
      const key = getClientStatusKey(clientId);
      localStorage.setItem(key, status);
      console.log("saved client status:", { clientId, status });
    } catch (error) {
      console.error("Error saving client status:", error);
    }
  };

  const loadClientStatus = (clientId: string): string => {
    try {
      const key = getClientStatusKey(clientId);
      const status = localStorage.getItem(key);
      return status || "No Status";
    } catch (error) {
      console.error("Error loading client status:", error);
      return "No Status";
    }
  };

  const handleClientStatusChange = (clientId: string, status: string) => {
    saveClientStatus(clientId, status);

    toast({
      title: "Status Updated",
      description: `Client status updated to "${status}".`,
    });
  };

  // Load cached clients immediately on mount
  useEffect(() => {
    if (isPreSaleUser) return;
    try {
      const cachedClients = localStorage.getItem('cachedClients');
      if (cachedClients) {
        const parsed = JSON.parse(cachedClients);
        setClients(parsed);
        setLoading(false);
        console.log('✅ Loaded', parsed.length, 'clients from cache');
      }
    } catch (error) {
      console.error('Error loading cached clients:', error);
    }
  }, [isPreSaleUser]);

  useEffect(() => {
    if (isPreSaleUser) return;
    const fetchClients = async () => {
      try {
        console.log('🚀 === FETCH CLIENTS STARTED ===');

        // Check if user is admin or agent
        const userData = localStorage.getItem('userData');
        console.log('📦 Raw userData from localStorage:', userData);

        let isAdmin = false;
        let userId = null;
        let userEmail = '';
        let username = '';

        if (userData) {
          try {
            const user = JSON.parse(userData);
            console.log('👤 Parsed user object:', user);

            isAdmin = user.email === "admin@example.com";
            userId = user.id;
            userEmail = (user.email || '').toLowerCase().trim();
            username = (user.username || '').toLowerCase().trim();

            console.log('📧 User email from localStorage:', userEmail);
            console.log('👤 Username from localStorage:', username);
            console.log('🎯 Target email to match:', "vaishnavig@relai.world");
            console.log('🎯 Target username to match:', "vaishnavi");
            console.log('✓ Email match:', userEmail === "vaishnavig@relai.world");
            console.log('✓ Username match:', username === "vaishnavi");
          } catch (error) {
            console.error('❌ Error parsing user data:', error);
          }
        } else {
          console.log('⚠️ No userData found in localStorage');
        }

        let response;
        let data;

        // Check if user should fetch from Zoho leads
        const isZohoUser =
          userEmail === "vaishnavig@relai.world" ||
          username === "vaishnavi" ||
          userEmail === "subscriptions@relai.world" ||
          userEmail === "angaleenaj@relai.world" ||
          username === "angaleena" ||
          userEmail === "sindhua@relai.world" ||
          userEmail === "sindhu@relai.world" ||
          username === "sindhu";
        console.log('🔍 Is Zoho user?', isZohoUser);

        if (isZohoUser) {
          console.log('✅ USER IS ZOHO USER - Fetching leads from Zoho CRM');
          // Use the logged-in user's email for API call
          const emailToUse = userEmail;
          const zohoUrl = API_ENDPOINTS.ZOHO_LEADS(emailToUse);
          console.log('🌐 Zoho API URL:', zohoUrl);

          response = await fetch(zohoUrl);
          console.log('📡 Zoho API response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Zoho API error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          console.log('📊 Zoho API result:', result);
          console.log('📊 Number of leads from Zoho:', result.leads?.length || 0);

          // Map Zoho leads to client format
          data = (result.leads || []).map((lead: any) => ({
            id: lead.id,
            mobile: lead.mobile,
            leadname: lead.leadName,
            lastname: lead.leadName,
            email: lead.email,
            modifiedTime: lead.createdTime,
            property_type: "Not specified",
            budget: "Not specified",
            location: "Not specified",
            possession_date: "Not specified",
            configuration: "Not specified",
            property_size: "Not specified",
          }));

          console.log('✅ Mapped Zoho leads to client format. Count:', data.length);
        } else if (isAdmin) {
          // Admin sees all clients
          response = await fetch("/api/webhook-handler");
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          data = await response.json();
        } else if (userId) {
          // Agent sees only assigned clients
          response = await fetch(`/api/agent/${userId}/clients`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const result = await response.json();
          data = result.clients || [];
        } else {
          // No valid user data, show empty
          data = [];
        }

        // Load saved locations from localStorage
        const clientLocations = JSON.parse(
          localStorage.getItem("clientLocations") || "{}",
        );

        // Map API data to the component's expected structure
        const formattedClients = data.map((apiClient) => ({
          id: apiClient.id || apiClient.mobile, // Use existing ID or fall back to mobile
          name: apiClient.lastname || apiClient.leadname || "N/A",
          email: apiClient.email || "N/A",
          phone: apiClient.mobile,
          location: clientLocations[apiClient.mobile] || "Unknown Location", // Use saved location or default
          priority: "High", // Default value
          preferences: {
            property_type: apiClient.property_type || "Not specified",
            budget: apiClient.budget || "Not specified",
            location: apiClient.location || "Not specified",
            possession_date: apiClient.possession_date || "Not specified",
            configuration: apiClient.configuration || "Not specified",
            property_size: apiClient.property_size || "Not specified",
          },
          lastContact: apiClient.modifiedTime,
          matchedProperties: 5, // Default value
          // New property requirement fields
          budget: {
            min: apiClient.minBudget || "Not specified",
            max: apiClient.maxBudget || "Not specified",
          },
          possession: apiClient.possession || "Not specified",
          floorPreference: {
            min: apiClient.minFloor || "Not specified",
            max: apiClient.maxFloor || "Not specified",
          },
          size: {
            min: apiClient.minSize || "Not specified",
            max: apiClient.maxSize || "Not specified",
          },
          configuration: apiClient.configuration || "Not specified",
          propertyType: apiClient.propertyType || "Not specified", // Apartment/Villa
          communityType: apiClient.communityType || "Not specified", // Gated/Semi/Standalone
          facing: apiClient.facing || "Not specified",
          buildingType: apiClient.buildingType || "Not specified", // Low rise/High rise
        }));

        // Remove duplicates based on mobile number
        const uniqueClients = formattedClients.filter(
          (client, index, self) =>
            index === self.findIndex((c) => c.id === client.id),
        );

        setClients(uniqueClients);
        // Cache the clients list for instant loading
        try {
          localStorage.setItem('cachedClients', JSON.stringify(uniqueClients));
          console.log('💾 Cached', uniqueClients.length, 'clients to localStorage');
        } catch (error) {
          console.error('Error caching clients:', error);
        }
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch clients:", error);
        toast({
          title: "Error",
          description: "Could not fetch client data.",
          variant: "destructive",
        });
      }
    };

    fetchClients();
  }, [toast, isPreSaleUser]);

  // Refresh data when page becomes visible (user returns from detail page)
  useEffect(() => {
    if (isPreSaleUser) return;
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Refetch clients when page becomes visible
        const fetchClients = async () => {
          try {
            // Check if user is admin or agent
            const userData = localStorage.getItem('userData');
            let isAdmin = false;
            let userId = null;
            let userEmail = '';
            let username = '';

            if (userData) {
              try {
                const user = JSON.parse(userData);
                isAdmin = user.email === "admin@example.com";
                userId = user.id;
                userEmail = (user.email || '').toLowerCase().trim();
                username = (user.username || '').toLowerCase().trim();
              } catch (error) {
                console.error('Error parsing user data:', error);
              }
            }

            let response;
            let data;

            // Check if user should fetch from Zoho leads
            const isZohoUser =
              userEmail === "vaishnavig@relai.world" ||
              username === "vaishnavi" ||
              userEmail === "subscriptions@relai.world" ||
              userEmail === "angaleenaj@relai.world" ||
              username === "angaleena" ||
              userEmail === "sindhua@relai.world" ||
              userEmail === "sindhu@relai.world" ||
              username === "sindhu";
            if (isZohoUser) {
              // Use the logged-in user's email for API call
              const emailToUse = userEmail;
              response = await fetch(API_ENDPOINTS.ZOHO_LEADS(emailToUse));
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const result = await response.json();
              // Map Zoho leads to client format
              data = (result.leads || []).map((lead: any) => ({
                id: lead.id,
                mobile: lead.mobile,
                leadname: lead.leadName,
                lastname: lead.leadName,
                email: lead.email,
                modifiedTime: lead.createdTime,
                property_type: "Not specified",
                budget: "Not specified",
                location: "Not specified",
                possession_date: "Not specified",
                configuration: "Not specified",
                property_size: "Not specified",
              }));
            } else if (isAdmin) {
              // Admin sees all clients
              response = await fetch("/api/webhook-handler");
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              data = await response.json();
            } else if (userId) {
              // Agent sees only assigned clients
              response = await fetch(`/api/agent/${userId}/clients`);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const result = await response.json();
              data = result.clients || [];
            } else {
              // No valid user data, show empty
              data = [];
            }

            // Load saved locations from localStorage
            const clientLocations = JSON.parse(
              localStorage.getItem("clientLocations") || "{}",
            );

            // Map API data to the component's expected structure
            const formattedClients = data.map((apiClient) => ({
              id: apiClient.id || apiClient.mobile, // Use existing ID or fall back to mobile
              name: apiClient.lastname || apiClient.leadname || "N/A",
              email: apiClient.email || "N/A",
              phone: apiClient.mobile,
              location: clientLocations[apiClient.mobile] || "Unknown Location", // Use saved location or default
              priority: "High", // Default value
              preferences: {
                property_type: apiClient.property_type || "Not specified",
                budget: apiClient.budget || "Not specified",
                location: apiClient.location || "Not specified",
                possession_date: apiClient.possession_date || "Not specified",
                configuration: apiClient.configuration || "Not specified",
                property_size: apiClient.property_size || "Not specified",
              },
              lastContact: apiClient.modifiedTime,
              matchedProperties: 5, // Default value
              // New property requirement fields
              budget: {
                min: apiClient.minBudget || "Not specified",
                max: apiClient.maxBudget || "Not specified",
              },
              possession: apiClient.possession || "Not specified",
              floorPreference: {
                min: apiClient.minFloor || "Not specified",
                max: apiClient.maxFloor || "Not specified",
              },
              size: {
                min: apiClient.minSize || "Not specified",
                max: apiClient.maxSize || "Not specified",
              },
              configuration: apiClient.configuration || "Not specified",
              propertyType: apiClient.propertyType || "Not specified", // Apartment/Villa
              communityType: apiClient.communityType || "Not specified", // Gated/Semi/Standalone
              facing: apiClient.facing || "Not specified",
              buildingType: apiClient.buildingType || "Not specified", // Low rise/High rise
            }));

            // Remove duplicates based on mobile number
            const uniqueClients = formattedClients.filter(
              (client, index, self) =>
                index === self.findIndex((c) => c.id === client.id),
            );

            setClients(uniqueClients);
            // Cache the clients list
            try {
              localStorage.setItem('cachedClients', JSON.stringify(uniqueClients));
            } catch (error) {
              console.error('Error caching clients:', error);
            }
          } catch (error) {
            console.error("Failed to fetch clients:", error);
          }
        };

        fetchClients();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isPreSaleUser]);

  // Initialize priorities and shortlisted counts once clients are fetched
  useEffect(() => {
    if (clients.length > 0) {
      const initialPriorities = Object.fromEntries(
        clients.map((client) => [client.id, client.priority]),
      );
      setClientPriorities(initialPriorities);

      const initialShortlisted = Object.fromEntries(
        clients.map((client) => [client.id, 0]), // Start with 0
      );
      setShortlistedCounts(initialShortlisted);
    }
  }, [clients]);

  if (isPreSaleUser) {
    return null;
  }

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm) ||
      client.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.preferences.property_type
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      client.preferences.budget
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      client.preferences.location
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      client.preferences.configuration
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesPriority =
      !priorityFilter || clientPriorities[client.id] === priorityFilter;
    const hasSiteVisit = getClientProgress(client.id) === "Site Visit";
    const matchesSiteVisit =
      !siteVisitFilter ||
      (siteVisitFilter === "yes" ? hasSiteVisit : !hasSiteVisit);

    return matchesSearch && matchesPriority && matchesSiteVisit;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedClients = filteredClients.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, priorityFilter, siteVisitFilter]);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClientClick = (clientId) => {
    navigate(`/clients/${clientId}`);
  };

  const handlePriorityChange = (clientId, newPriority) => {
    setClientPriorities((prev) => ({
      ...prev,
      [clientId]: newPriority,
    }));
    toast({
      title: "Priority Updated",
      description: `Client priority has been changed to ${newPriority}`,
    });
  };

  // Fetch agents on component mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agents');
        if (response.ok) {
          const data = await response.json();
          setAgents(data.agents);
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      }
    };

    fetchAgents();
  }, []);

  // Load saved agent assignments from database
  useEffect(() => {
    const loadAgentAssignments = async () => {
      try {
        const response = await fetch('/api/client-agent-assignments');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setClientAgentAssignments(data.assignments || {});
          }
        } else {
          // Fallback to localStorage if API fails
          const savedAssignments = JSON.parse(
            localStorage.getItem('clientAgentAssignments') || '{}'
          );
          setClientAgentAssignments(savedAssignments);
        }
      } catch (error) {
        console.error('Error loading agent assignments from API:', error);
        // Fallback to localStorage
        const savedAssignments = JSON.parse(
          localStorage.getItem('clientAgentAssignments') || '{}'
        );
        setClientAgentAssignments(savedAssignments);
      }
    };

    loadAgentAssignments();
  }, []);

  const handleAgentAssignment = async (clientId, agentId) => {
    try {
      // Handle "none" value as null/undefined for no agent
      const actualAgentId = agentId === "none" ? null : agentId;

      // Update local state
      setClientAgentAssignments(prev => ({
        ...prev,
        [clientId]: actualAgentId
      }));

      // Send to backend only if there's an actual agent
      if (actualAgentId) {
        const response = await fetch(`/api/clients/${clientId}/assign-agent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ agentId: actualAgentId }),
        });

        if (response.ok) {
          toast({
            title: "Agent Assigned",
            description: `Client assigned to agent successfully.`,
          });
        }
      } else {
        toast({
          title: "Agent Removed",
          description: `Agent assignment removed from client.`,
        });
      }
    } catch (error) {
      console.error('Error assigning agent:', error);
      toast({
        title: "Error",
        description: "Failed to assign agent to client.",
        variant: "destructive",
      });
    }
  };

  const handleAddRequirement = async (requirementData) => {
    try {
      console.log("=== ADD REQUIREMENT DEBUG ===");
      console.log("Creating requirement with data:", requirementData);
      console.log("Data type:", typeof requirementData);
      console.log("Data keys:", Object.keys(requirementData));

      const response = await fetch(API_ENDPOINTS.CREATE_REQUIREMENT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requirementData),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      console.log("API Response:", result);

      if (result.success) {
        toast({
          title: "Requirement Created Successfully",
          description: `Found ${result.totalMatches} matching properties. Redirecting to client details...`,
        });

        // Store the matching properties data for the ClientDetail page
        localStorage.setItem(
          "newRequirementResults",
          JSON.stringify({
            ...result,
            requirementData,
            timestamp: new Date().toISOString(),
          }),
        );

        // Navigate to the first client's detail page to show the matched properties
        if (clients.length > 0) {
          navigate(`/clients/${clients[0].id}`);
        } else {
          // If no clients, show the modal as fallback
          setMatchingProperties(result.matchingProperties);
          setMatchingPropertiesModalOpen(true);
        }
      } else {
        throw new Error(result.error || "Failed to create requirement");
      }
    } catch (error) {
      console.error("=== ADD REQUIREMENT ERROR ===");
      console.error("Error creating requirement:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      toast({
        title: "Error",
        description: "Failed to create requirement. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            {isPreSaleUser ? 'Pre-Sale' : 'Client Management'}
          </h1 >
          <p className="text-muted-foreground">
            {(() => {
              const userData = localStorage.getItem('userData');
              if (userData) {
                try {
                  const user = JSON.parse(userData);
                  if (user.email === "admin@example.com") {
                    return "Manage your client relationships and track their property preferences";
                  } else {
                    return `View and manage clients assigned to you (${user.username})`;
                  }
                } catch {
                  return "Manage your client relationships and track their property preferences";
                }
              }
              return "Manage your client relationships and track their property preferences";
            })()}
          </p>
        </div >

        <div className="flex items-center gap-2">
          {/* Admin Dashboard Button */}
          {(() => {
            const userData = localStorage.getItem('userData');
            if (userData) {
              try {
                const user = JSON.parse(userData);
                if (user.email === "admin@example.com") {
                  return (
                    <Button
                      variant="outline"
                      onClick={() => navigate("/admin-clients")}
                      className="flex items-center gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      Admin Dashboard
                    </Button>
                  );
                } else {
                  return (
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">
                        Agent: {user.username}
                      </span>
                    </div>
                  );
                }
              } catch {
                // Ignore parsing errors
              }
            }
            return null;
          })()}
        </div>
      </div >

      {/* Search and Filters */}
      < div className="flex items-center space-x-4" >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients by name, phone, location, or preferences..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-clients"
          />
        </div>
        {/* <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-4">
                <h4 className="font-medium leading-none">Filter Options</h4>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Priority</Label>
                  <Select value={priorityFilter || "all"} onValueChange={(value) => setPriorityFilter(value === "all" ? null : value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Site Visit</Label>
                  <Select value={siteVisitFilter || "all"} onValueChange={(value) => setSiteVisitFilter(value === "all" ? null : value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="yes">Has Site Visit</SelectItem>
                      <SelectItem value="no">No Site Visit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover> */}
        <div className="flex gap-2 ml-auto">
          <Button
            variant={view === "grid" ? "secondary" : "outline"}
            size="icon"
            className="rounded-full"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "outline"}
            size="icon"
            className="rounded-full"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div >

      {/* Client Grid/List */}
      {
        view === "grid" ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {paginatedClients.map((client, index) => (
              <Card
                key={`${client.id}-${index}`}
                className="cursor-pointer transition-all duration-200 hover:shadow-hover hover:scale-[1.02] animate-slide-up border-border"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => handleClientClick(client.id)}
              >
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-foreground">
                    {client.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {client.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {client.phone}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground mb-1">
                        Preferences
                      </p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          <span className="font-medium">Type:</span>{" "}
                          {client.preferences.property_type}
                        </div>
                        <div>
                          <span className="font-medium">Budget:</span>{" "}
                          {client.preferences.budget}
                        </div>
                        <div>
                          <span className="font-medium">Location:</span>{" "}
                          {client.preferences.location}
                        </div>
                        <div>
                          <span className="font-medium">Timeline:</span>{" "}
                          {calculatePossessionTimeline(
                            client.preferences.possession_date,
                          )}
                        </div>
                        <div>
                          <span className="font-medium">Config:</span>{" "}
                          {client.preferences.configuration}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-foreground mb-1">
                        Status
                      </p>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={loadClientStatus(client.id)}
                          onValueChange={(value) =>
                            handleClientStatusChange(client.id, value)
                          }
                        >
                          <SelectTrigger className="w-36 h-6 text-xs">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent className="max-h-48 overflow-y-auto">
                            <SelectItem value="No Status">No Status</SelectItem>
                            <SelectItem value="Site visit Initiated">
                              Site visit Initiated
                            </SelectItem>
                            <SelectItem value="Done Site Visit">
                              Done Site Visit
                            </SelectItem>
                            <SelectItem value="Finalized">Finalized</SelectItem>
                            <SelectItem value="Token Amount">
                              Token Amount
                            </SelectItem>
                            <SelectItem value="AOS loan procedure">
                              AOS loan procedure
                            </SelectItem>
                            <SelectItem value="AOS initiated">
                              AOS initiated
                            </SelectItem>
                            <SelectItem value="AOS Done">AOS Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-foreground mb-1">
                      Assigned Agent
                    </p>
                    <div onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const userData = localStorage.getItem('userData');
                        let isAdmin = false;

                        if (userData) {
                          try {
                            const user = JSON.parse(userData);
                            isAdmin = user.email === "admin@example.com";
                          } catch {
                            isAdmin = false;
                          }
                        }

                        if (isAdmin) {
                          // Admin can assign agents
                          return (
                            <Select
                              value={clientAgentAssignments[client.id] || 'none'}
                              onValueChange={(value) =>
                                handleAgentAssignment(client.id, value)
                              }
                            >
                              <SelectTrigger className="w-40 h-6 text-xs">
                                <SelectValue placeholder="Select Agent" />
                              </SelectTrigger>
                              <SelectContent className="max-h-48 overflow-y-auto">
                                <SelectItem value="none">No Agent Assigned</SelectItem>
                                {agents.map((agent) => (
                                  <SelectItem key={agent.id} value={agent.id}>
                                    {agent.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        } else {
                          // Agent can only view assignment, not change it
                          const assignedAgent = agents.find(agent => agent.id === clientAgentAssignments[client.id]);
                          return (
                            <div className="w-40 h-6 text-xs bg-gray-50 rounded px-2 py-1 flex items-center">
                              {assignedAgent ? assignedAgent.name : "No Agent Assigned"}
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Last contact:{" "}
                      {new Date(client.lastContact).toLocaleDateString()}
                    </div>
                    <Badge variant="outline">
                      {shortlistedCounts[client.id] || 0} shortlisted,{" "}
                      {client.matchedProperties} matched
                    </Badge>

                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {paginatedClients.map((client, index) => (
              <Card
                key={`${client.id}-${index}`}
                className="flex flex-row items-center gap-4 p-4 cursor-pointer hover:shadow-hover animate-slide-up border-border"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => handleClientClick(client.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {client.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-base text-muted-foreground">
                      <Phone className="h-5 w-5" />
                      {client.phone}
                    </div>

                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Last contact:{" "}
                      {new Date(client.lastContact).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Type:</span>
                      {client.preferences.property_type}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Budget:</span>
                      {client.preferences.budget}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Timeline:</span>
                      {calculatePossessionTimeline(
                        client.preferences.possession_date,
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Config:</span>
                      {client.preferences.configuration}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Matches:</span>
                      {client.matchedProperties}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Status:</span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={loadClientStatus(client.id)}
                          onValueChange={(value) =>
                            handleClientStatusChange(client.id, value)
                          }
                        >
                          <SelectTrigger className="w-24 h-6 text-xs">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent className="max-h-48 overflow-y-auto">
                            <SelectItem value="No Status">No Status</SelectItem>
                            <SelectItem value="Site visit Initiated">
                              Site visit Initiated
                            </SelectItem>
                            <SelectItem value="Done Site Visit">
                              Done Site Visit
                            </SelectItem>
                            <SelectItem value="Finalized">Finalized</SelectItem>
                            <SelectItem value="Token Amount">
                              Token Amount
                            </SelectItem>
                            <SelectItem value="AOS loan procedure">
                              AOS loan procedure
                            </SelectItem>
                            <SelectItem value="AOS initiated">
                              AOS initiated
                            </SelectItem>
                            <SelectItem value="AOS Done">AOS Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Agent:</span>
                      <div onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const userData = localStorage.getItem('userData');
                          let isAdmin = false;

                          if (userData) {
                            try {
                              const user = JSON.parse(userData);
                              isAdmin = user.email === "admin@example.com";
                            } catch {
                              isAdmin = false;
                            }
                          }

                          if (isAdmin) {
                            // Admin can assign agents
                            return (
                              <Select
                                value={clientAgentAssignments[client.id] || 'none'}
                                onValueChange={(value) =>
                                  handleAgentAssignment(client.id, value)
                                }
                              >
                                <SelectTrigger className="w-32 h-6 text-xs">
                                  <SelectValue placeholder="Select Agent" />
                                </SelectTrigger>
                                <SelectContent className="max-h-48 overflow-y-auto">
                                  <SelectItem value="none">No Agent</SelectItem>
                                  {agents.map((agent) => (
                                    <SelectItem key={agent.id} value={agent.id}>
                                      {agent.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                          } else {
                            // Agent can only view assignment, not change it
                            const assignedAgent = agents.find(agent => agent.id === clientAgentAssignments[client.id]);
                            return (
                              <div className="w-32 h-6 text-xs bg-gray-50 rounded px-2 py-1 flex items-center">
                                {assignedAgent ? assignedAgent.name : "No Agent"}
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>

                  </div >
                </div >
              </Card >
            ))
            }
          </div >
        )
      }

      {/* Pagination Controls */}
      {
        filteredClients.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredClients.length)} of {filteredClients.length} clients
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="min-w-[40px]"
                      >
                        {page}
                      </Button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-2">...</span>;
                  }
                  return null;
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )
      }

      {/* Empty State */}
      {
        filteredClients.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No clients found
            </h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or add a new client.
            </p>
            <Button variant="professional">Add Your First Client</Button>
          </div>
        )
      }

      {/* Add Requirement Modal */}
      <AddRequirementModal
        isOpen={addRequirementModalOpen}
        onClose={() => {
          console.log("=== MODAL CLOSE ===");
          setAddRequirementModalOpen(false);
        }}
        onSubmit={handleAddRequirement}
      />

      {/* Matching Properties Modal */}
      <MatchingPropertiesModal
        isOpen={matchingPropertiesModalOpen}
        onClose={() => setMatchingPropertiesModalOpen(false)}
        properties={matchingProperties}
      />
    </div >
  );
}
