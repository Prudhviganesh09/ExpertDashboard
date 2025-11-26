import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, MapPin, User, Video, Phone, MessageSquare, ChevronDown, Home, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/config/api";

type FilterPeriod = "today" | "tomorrow" | "week" | "month";

interface Meeting {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  time: string;
  type: string;
  location: string;
  status: string;
  description: string;
  duration: string;
  meetingType: string;
  clientEmail?: string;
  clientPhone?: string;
  clientPreferences?: {
    property_type: string;
    budget: string;
    location: string;
    configuration: string;
  };
}

interface SiteVisit {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  time: string;
  type: string;
  location: string;
  status: string;
  propertyTitle: string;
  propertyAddress: string;
  notes?: string;
  meetingType: string;
  clientEmail?: string;
  clientPhone?: string;
}

type CalendarItem = Meeting | SiteVisit;

const filterButtons = [
  { id: "today", label: "Today", period: "today" as FilterPeriod },
  { id: "tomorrow", label: "Tomorrow", period: "tomorrow" as FilterPeriod },
  { id: "week", label: "This Week", period: "week" as FilterPeriod },
  { id: "month", label: "This Month", period: "month" as FilterPeriod }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed": return "default";
    case "pending": return "secondary";
    case "cancelled": return "destructive";
    default: return "outline";
  }
};

const getMeetingIcon = (type: string) => {
  switch (type) {
    case "virtual": return Video;
    case "phone": return Phone;
    default: return User;
  }
};

export default function Calendar() {
  const [activeFilter, setActiveFilter] = useState<FilterPeriod>("today");
  const [meetingTypeFilter, setMeetingTypeFilter] = useState("all");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Function to fetch site visits from all clients
  const fetchSiteVisits = async () => {
    try {
      // Get all clients from the webhook handler
      const response = await fetch(API_ENDPOINTS.CLIENTS);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const clients = await response.json();
      const allSiteVisits: SiteVisit[] = [];

      // Process each client's requirements to extract site visits
      clients.forEach((client: any) => {
        const clientId = client.mobile || client.id;
        const clientName = client.lastname || client.name || client.leadname || "Unknown Client";
        const clientEmail = client.email || "N/A";
        const clientPhone = client.mobile || "N/A";

        // Get requirements from localStorage for this client
        const requirementsKey = `client_${clientId}_requirements`;
        const storedRequirements = localStorage.getItem(requirementsKey);

        if (storedRequirements) {
          try {
            const requirements = JSON.parse(storedRequirements);

            // Extract site visits from all requirements
            requirements.forEach((requirement: any, reqIndex: number) => {
              if (requirement.siteVisits && requirement.siteVisits.length > 0) {
                requirement.siteVisits.forEach((visit: any, visitIndex: number) => {
                  allSiteVisits.push({
                    id: `sitevisit_${clientId}_${reqIndex}_${visitIndex}`,
                    clientId: clientId,
                    clientName: clientName,
                    date: visit.date,
                    time: visit.time,
                    type: "Site Visit",
                    location: visit.property?.address || "Location TBD",
                    status: "confirmed", // Site visits are typically confirmed
                    propertyTitle: visit.property?.title || "Unknown Property",
                    propertyAddress: visit.property?.address || "Address not specified",
                    notes: visit.notes,
                    meetingType: "in-person",
                    clientEmail: clientEmail,
                    clientPhone: clientPhone
                  });
                });
              }
            });
          } catch (error) {
            console.error(`Error parsing requirements for client ${clientId}:`, error);
          }
        }
      });

      setSiteVisits(allSiteVisits);
    } catch (error) {
      console.error("Failed to fetch site visits:", error);
      // Don't set error here as it's not critical
    }
  };

  // Fetch meetings and site visits from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch meetings
        const meetingsResponse = await fetch(API_ENDPOINTS.MEETINGS);
        if (!meetingsResponse.ok) {
          throw new Error(`HTTP error! status: ${meetingsResponse.status}`);
        }

        const meetingsData = await meetingsResponse.json();

        if (meetingsData.success) {
          setMeetings(meetingsData.meetings);
        } else {
          throw new Error(meetingsData.error || 'Failed to fetch meetings');
        }

        // Fetch site visits
        await fetchSiteVisits();

      } catch (error) {
        console.error("Failed to fetch data:", error);
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filterItems = (period: FilterPeriod) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const filterByDate = (date: string) => {
      const itemDate = new Date(date);

      switch (period) {
        case "today":
          return itemDate.toDateString() === today.toDateString();
        case "tomorrow":
          return itemDate.toDateString() === tomorrow.toDateString();
        case "week":
          const weekStart = new Date(today);
          weekStart.setDate(today.getDay() === 0 ? today.getDate() - 6 : today.getDate() - (today.getDay() - 1));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return itemDate >= weekStart && itemDate <= weekEnd;
        case "month":
          return itemDate.getMonth() === today.getMonth() &&
                 itemDate.getFullYear() === today.getFullYear();
        default:
          return true;
      }
    };

    const filteredMeetings = meetings.filter(meeting => filterByDate(meeting.date));
    const filteredSiteVisits = siteVisits.filter(visit => filterByDate(visit.date));

    return { filteredMeetings, filteredSiteVisits };
  };

  const { filteredMeetings, filteredSiteVisits } = filterItems(activeFilter);

  const filteredMeetingsByType = filteredMeetings.filter(meeting => {
    if (meetingTypeFilter === "all") return true;
    if (meetingTypeFilter === "propertyvisits") return meeting.type.toLowerCase().includes("visit");
    if (meetingTypeFilter === "meetings") return meeting.type.toLowerCase().includes("meeting") || meeting.type.toLowerCase().includes("consultation") || meeting.type.toLowerCase().includes("review") || meeting.type.toLowerCase().includes("tour") || meeting.type.toLowerCase().includes("follow-up") || meeting.type.toLowerCase().includes("inspection");
    return true;
  });

  const filteredSiteVisitsByType = filteredSiteVisits.filter(visit => {
    if (meetingTypeFilter === "all") return true;
    if (meetingTypeFilter === "propertyvisits") return true; // All site visits are property visits
    if (meetingTypeFilter === "meetings") return false; // Site visits are not meetings
    return true;
  });

  // Combine and sort all items by date and time
  const allItems: CalendarItem[] = [...filteredMeetingsByType, ...filteredSiteVisitsByType].sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });

  const handleMeetingClick = (clientId: string) => {
    navigate(`/clients/${clientId}`);
  };

  const handleLaunchMeeting = (meetingId: string, type: string) => {
    // Placeholder for meeting launch functionality
    console.log(`Launching ${type} meeting ${meetingId}`);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Calendar & Meetings</h1>
          <p className="text-muted-foreground">
            Manage your scheduled meetings and appointments with clients
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading meetings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Calendar & Meetings</h1>
          <p className="text-muted-foreground">
            Manage your scheduled meetings and appointments with clients
          </p>
        </div>
        <Card className="p-12 text-center">
          <div className="mx-auto h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <MessageSquare className="h-12 w-12 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Error loading meetings</h3>
          <p className="text-muted-foreground mb-4">
            {error}
          </p>
          <Button
            variant="professional"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Calendar & Meetings</h1>
        <p className="text-muted-foreground">
          Manage your scheduled meetings and appointments with clients
        </p>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {filterButtons.map((filter) => (
          <Button
            key={filter.id}
            variant={activeFilter === filter.period ? "professional" : "outline"}
            onClick={() => setActiveFilter(filter.period)}
            className="transition-all duration-200"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Calendar Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="animate-slide-up">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{allItems.length}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {allItems.filter(item => item.status === "confirmed").length}
                </p>
                <p className="text-sm text-muted-foreground">Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {allItems.filter(item => item.status === "pending").length}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Video className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {allItems.filter(item => item.meetingType === "virtual").length}
                </p>
                <p className="text-sm text-muted-foreground">Virtual</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Home className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {filteredSiteVisitsByType.length}
                </p>
                <p className="text-sm text-muted-foreground">Site Visits</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Items List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Calendar Items for {filterButtons.find(f => f.period === activeFilter)?.label}
          </h2>
          <div className="flex gap-2 items-center">
            {/* New filter dropdown */}
            <div className="relative inline-block">
              <select
                className="appearance-none border rounded px-3 py-1.5 text-sm pr-8 focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 bg-background hover:bg-accent/10 cursor-pointer"
                value={meetingTypeFilter}
                onChange={e => setMeetingTypeFilter(e.target.value)}
              >
                <option value="all">ALL</option>
                <option value="propertyvisits">Property Visits</option>
                <option value="meetings">Meetings</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <Button variant="professional">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </div>
        </div>

        {allItems.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="mx-auto h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-4">
              <CalendarIcon className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No calendar items scheduled</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any meetings or site visits scheduled for this period.
            </p>
            <Button variant="professional">Schedule Your First Item</Button>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                <div className="grid grid-cols-7 gap-4 px-6 py-3 bg-muted font-semibold text-muted-foreground text-sm">
                  <div>Time</div>
                  <div>Type</div>
                  <div>Client</div>
                  <div>Property/Location</div>
                  <div>Date</div>
                  <div>Status</div>
                  <div>Actions</div>
                </div>
                {allItems.map((item, index) => {
                  const isSiteVisit = 'propertyTitle' in item;
                  const MeetingIcon = isSiteVisit ? Home : getMeetingIcon(item.meetingType);

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-7 gap-4 items-center px-6 py-4 hover:bg-accent/30 cursor-pointer transition-all"
                      style={{ animationDelay: `${index * 0.05}s` }}
                      onClick={() => handleMeetingClick(item.clientId)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.time}</span>
                        {!isSiteVisit && <span className="text-xs text-muted-foreground">{item.duration}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <MeetingIcon className="h-4 w-4" />
                        <span>{item.type}</span>
                        {isSiteVisit && (
                          <Badge variant="outline" className="text-xs">Site Visit</Badge>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{item.clientName}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.clientPhone || ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {isSiteVisit ? (
                          <div>
                            <div className="font-medium text-sm">{item.propertyTitle}</div>
                            <div className="text-xs text-muted-foreground">{item.propertyAddress}</div>
                          </div>
                        ) : (
                          <>
                            {/* Only show location text for non-virtual meetings */}
                            {item.meetingType !== "virtual" && <span>{item.location}</span>}
                            {/* Add Zoom button for virtual meetings */}
                            {item.meetingType === "virtual" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="ml-2"
                                onClick={e => {
                                  e.stopPropagation();
                                  window.open("https://zoom.us/j/1234567890", "_blank");
                                }}
                              >
                                Join Zoom
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{new Date(item.date).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <Badge variant={getStatusColor(item.status) as any}>{item.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSiteVisit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={e => {
                              e.stopPropagation();
                              // Navigate to client detail page
                              navigate(`/clients/${item.clientId}`);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Client
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}