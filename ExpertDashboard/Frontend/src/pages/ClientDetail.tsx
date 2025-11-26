import { useParams, useNavigate } from "react-router-dom";
import React from "react";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, MapPin, Phone, Mail, Calendar, Star,
  MessageSquare, Home, Bath, Car, Square,
  Eye, Heart, Share, DollarSign, Bookmark,
  CalendarDays, Clock, X, Edit3, Check as CheckIcon, RefreshCw, Database, Key, FileText, Bug, Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/config/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ExpertScheduling from "./ExpertScheduling";

// Dynamic client data will be fetched from API

const LOCALSTORAGE_PREFIX = 'client_chat_';

// Location to Area mapping based on Google Sheets data
// Key: location code, Value: array of areas with that code
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

// Create reverse mapping: area name -> location code
const AREA_TO_LOCATION_CODE: Record<string, number> = {};
Object.entries(LOCATION_AREA_MAPPING).forEach(([code, areas]) => {
  areas.forEach(area => {
    AREA_TO_LOCATION_CODE[area] = parseInt(code);
  });
});

// Interfaces
interface Property {
  id: string;
  title: string;
  address: string;
  price: string;
  bedrooms: number | string;
  bathrooms: number;
  sqft: string;
  match: number;
  mongodbId?: string | null;
  reraId?: string | null;
  configurations?: string[];
  builderName?: string;
  possessionDate?: string;
  propertyType?: string;
  gridScore?: number;
  amenities?: {
    hospitals: number;
    schools: number;
    malls: number;
    restaurants: number;
  };
  status?: string;
  image?: string;
  developer?: string;
  possession?: string;
  configuration?: string;
  googleMapsUrl?: string;
  projectName?: string | null;
  // Raw API fields
  _id?: string;
  ProjectName?: string;
  AreaName?: string;
  "Base Project Price"?: string;
  BHK?: number;
  Configuration?: string;
  "SQ FEET"?: string;
  Size?: string;
  RERA_Number?: string;
  BuilderName?: string;
  Builder_Name?: string;
  Possession_Date?: string;
  RERA_ID?: string;
  source?: string;
  property_type?: string;
  GRID_Score?: number;
  hospitals_count?: number;
  schools_count?: number;
  shopping_malls_count?: number;
  restaurants_count?: number;
  BaseProjectPrice?: string;
}

type SiteVisit =
  | { date: string; comments: string }
  | { property: Property; date: string; time: string; notes: string };

interface Requirement {
  id: number;
  name: string;
  preferences: {
    budget: string;
    budgetUnit?: string;
    location: string;
    possession: string;
    possessionTimeline?: string;
    minBudget: string;
    maxBudget: string;
    floorMin: string;
    floorMax: string;
    sizeMin: string;
    sizeMax: string;
    configuration: string;
    propertyType: string;
    gatedType: string;
    communityType?: string;
    facing: string;
    buildingType: string;
    financingOption?: string;
    includeGSTRegistration?: boolean;
    matchedPropertyCount?: string;
    propertySize?: string;
    locations?: string[];
    configurations?: string[];
    possessions?: string[];
    budgetRange?: string;
  };
  matchedProperties: Property[];
  shortlistedProperties: Property[];
  siteVisits: SiteVisit[];
  matchedCount?: number;
  uniqueMatchedCount?: number;
  matchedPropertyNames?: Property[];
  clientId?: string;
}

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone: string;
  mobile?: string;
  role: string;
  status: string;
  budget?: string;
  possession_date?: string;
  minBudget?: string;
  maxBudget?: string;
  minFloor?: string;
  maxFloor?: string;
  maxSize?: string;
  minSize?: string;
  configuration?: string;
  propertyType?: string;
  property_type?: string;
  communityType?: string;
  facing?: string;
  buildingType?: string;
  lastname?: string;
  leadname?: string;
  leadName?: string;
  modifiedTime?: string;
  conversations?: Record<string, any>[];
  location: string;
  lastContact: string;
  preferences: Requirement['preferences'];
  priority: string;
  matchedProperties: number;
}

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationValue, setLocationValue] = useState("Unknown Location");

  // Track when requirements were last manually updated to prevent overwriting
  const lastManualUpdateRef = useRef<number>(0);

  // Helper functions for localStorage persistence
  const getRequirementsKey = (clientId: string) => `client_${clientId}_requirements`;

  const saveRequirementsToStorage = (clientId: string, requirements: Requirement[]) => {
    // localStorage disabled - using API data only
  };

  const loadRequirementsFromStorage = (clientId: string) => {
    // localStorage disabled - using API data only
    return null;
  };

  const clearRequirementsFromStorage = (clientId: string) => {
    try {
      const key = getRequirementsKey(clientId);
      localStorage.removeItem(key);
      console.log('🗑️ Cleared requirements from localStorage for client:', clientId);
    } catch (error) {
      console.error('Error clearing requirements from localStorage:', error);
    }
  };

  // Property notes helper functions
  const getPropertyNotesKey = (clientId: string, propertyId: string) => `client_${clientId}_property_${propertyId}_notes`;

  const savePropertyNote = (clientId: string, propertyId: string, note: string) => {
    try {
      const key = getPropertyNotesKey(clientId, propertyId);
      localStorage.setItem(key, note);
      console.log('💾 Saved property note:', { clientId, propertyId, note });
    } catch (error) {
      console.error('Error saving property note:', error);
    }
  };

  const loadPropertyNote = (clientId: string, propertyId: string): string => {
    try {
      const key = getPropertyNotesKey(clientId, propertyId);
      const note = localStorage.getItem(key);
      return note || "";
    } catch (error) {
      console.error('Error loading property note:', error);
      return "";
    }
  };

  const openPropertyNotesDialog = (property: Property) => {
    setCurrentPropertyForNotes(property);
    const existingNote = loadPropertyNote(id!, property.id);
    setPropertyNoteText(existingNote);
    setPropertyNotesDialog(true);
  };

  const savePropertyNoteHandler = async () => {
    if (!currentPropertyForNotes || !id) return;

    setIsSavingNote(true);
    try {
      savePropertyNote(id, currentPropertyForNotes.id, propertyNoteText);

      // Update the property in the requirements to include the note
      const updatedRequirements = requirements.map(req => ({
        ...req,
        matchedProperties: req.matchedProperties.map(prop =>
          prop.id === currentPropertyForNotes.id
            ? { ...prop, note: propertyNoteText }
            : prop
        ),
        shortlistedProperties: req.shortlistedProperties.map(prop =>
          prop.id === currentPropertyForNotes.id
            ? { ...prop, note: propertyNoteText }
            : prop
        )
      }));

      setRequirements(updatedRequirements);
      saveRequirementsToStorage(id, updatedRequirements);

      toast({
        title: "Note Saved",
        description: "Property note has been saved successfully.",
      });

      setPropertyNotesDialog(false);
    } catch (error) {
      console.error('Error saving property note:', error);
      toast({
        title: "Error",
        description: "Failed to save property note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  // Initialize requirements - will be populated from API only
  const [requirements, setRequirements] = useState<Requirement[]>([]);

  const [activeRequirementId, setActiveRequirementId] = useState(1);
  const activeRequirement = requirements.find(r => r.id === activeRequirementId)!;


  const [siteVisitDialog, setSiteVisitDialog] = useState(false);
  const [siteVisitProperty, setSiteVisitProperty] = useState<any>(null);
  const [siteVisitDate, setSiteVisitDate] = useState("");
  const [siteVisitTime, setSiteVisitTime] = useState("");
  const [siteVisitNotes, setSiteVisitNotes] = useState("");

  const [meetingDialog, setMeetingDialog] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetings, setMeetings] = useState<Record<string, any>[]>([]);

  const [expertCallDialog, setExpertCallDialog] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState("");
  const [expertCallDate, setExpertCallDate] = useState("");
  const [expertCallTime, setExpertCallTime] = useState("");
  const [experts, setExperts] = useState<Record<string, any>[]>([]);
  const [expertMeetings, setExpertMeetings] = useState<Record<string, any>[]>([]);
  const [isSchedulingCall, setIsSchedulingCall] = useState(false);

  const [addReqDialog, setAddReqDialog] = useState(false);
  const [isCreatingRequirement, setIsCreatingRequirement] = useState(false);
  const [editingRequirementId, setEditingRequirementId] = useState<number | null>(null);
  const [newReqPreferences, setNewReqPreferences] = useState({
    budget: "",
    budgetUnit: "Crores" as "Crores" | "Lakhs",
    financingOption: "Loan option" as string,
    includeGSTRegistration: false,
    location: "", // Keep for compatibility
    locations: [] as string[], // Multiple locations support
    possession: "",
    possessions: [] as string[], // Multiple possessions support
    possessionTimeline: "Not decided yet",
    budgetRange: "Not decided yet",
    minBudget: "",
    maxBudget: "",
    floorMin: "",
    floorMax: "",
    sizeMin: "",
    sizeMax: "",
    configuration: "",
    configurations: [] as string[], // Multiple configurations support
    propertyType: "",
    gatedType: "",
    facing: "",
    buildingType: "",
  });

  const [areaNames, setAreaNames] = useState<string[]>([]);
  const [loadingAreaNames, setLoadingAreaNames] = useState(false);

  // Matched properties dialog
  const [matchedPropertiesDialog, setMatchedPropertiesDialog] = useState(false);
  const [selectedRequirementForProperties, setSelectedRequirementForProperties] = useState<any>(null);
  const [allMatchedProperties, setAllMatchedProperties] = useState<Property[]>([]);
  const [loadingAllProperties, setLoadingAllProperties] = useState(false);

  // Property notes functionality
  const [propertyNotesDialog, setPropertyNotesDialog] = useState(false);
  const [currentPropertyForNotes, setCurrentPropertyForNotes] = useState<any>(null);
  const [propertyNoteText, setPropertyNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Property status functionality
  const getPropertyStatusKey = (clientId: string, propertyId: string) => `client_${clientId}_property_${propertyId}_status`;

  const savePropertyStatus = (clientId: string, propertyId: string, status: string) => {
    try {
      const key = getPropertyStatusKey(clientId, propertyId);
      localStorage.setItem(key, status);
      console.log('💾 Saved property status:', { clientId, propertyId, status });
    } catch (error) {
      console.error('Error saving property status:', error);
    }
  };

  const loadPropertyStatus = (clientId: string, propertyId: string): string => {
    try {
      const key = getPropertyStatusKey(clientId, propertyId);
      const status = localStorage.getItem(key);
      return status || "No Status";
    } catch (error) {
      console.error('Error loading property status:', error);
      return "No Status";
    }
  };

  const handlePropertyStatusChange = (property: Property, status: string) => {
    if (!id) return;

    savePropertyStatus(id, property.id, status);

    // Update the property in the requirements to include the status
    const updatedRequirements = requirements.map(req => ({
      ...req,
      matchedProperties: req.matchedProperties.map(prop =>
        prop.id === property.id
          ? { ...prop, status: status }
          : prop
      ),
      shortlistedProperties: req.shortlistedProperties.map(prop =>
        prop.id === property.id
          ? { ...prop, status: status }
          : prop
      )
    }));

    setRequirements(updatedRequirements);
    saveRequirementsToStorage(id, updatedRequirements);

    toast({
      title: "Status Updated",
      description: `Property status updated to "${status}".`,
    });
  };

  // Conversation groups open/closed state
  const [openConversationGroup, setOpenConversationGroup] = useState<string | null>(null);

  // Function to fetch area names from MongoDB
  const fetchAreaNames = async () => {
    try {
      setLoadingAreaNames(true);
      const response = await fetch('/api/area-names');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setAreaNames(data.areaNames);
        console.log('Fetched area names:', data.areaNames);
      } else {
        console.error('Failed to fetch area names:', data.error);
      }
    } catch (error) {
      console.error('Error fetching area names:', error);
    } finally {
      setLoadingAreaNames(false);
    }
  };

  // Function to fetch matched property count and details from Supabase
  const fetchMatchedPropertyCount = async (preferences: Requirement['preferences'] | Record<string, any>, includeProperties = false): Promise<{ count: number, uniqueCount: number, properties: Property[] }> => {
    try {
      console.log('🔍 Fetching matched property count for preferences:', preferences);

      // Convert budget to rupees if needed
      let budgetMin = 0;
      let budgetMax = 0;

      // Try to parse budget with clean numeric extraction
      if (preferences.budget && preferences.budgetUnit) {
        // Remove currency symbols and text, extract numbers only
        const cleanBudget = preferences.budget.toString().replace(/[₹,\s]/g, '');
        const budgetNum = parseFloat(cleanBudget);

        if (!isNaN(budgetNum)) {
          const budgetMultiplier = preferences.budgetUnit === "Crores" ? 10000000 : 100000;
          const budgetInRupees = budgetNum * budgetMultiplier;
          // Show properties within budget range (not from 0)
          budgetMax = budgetInRupees;
          budgetMin = Math.max(0, budgetInRupees * 0.5); // Show properties from 50% to 100% of budget
        }
      } else if (preferences.budget && typeof preferences.budget === 'string') {
        const budgetStr = preferences.budget.toLowerCase();

        // Check if it's a range first (contains hyphen or "to")
        if (budgetStr.includes('-') || budgetStr.includes(' to ')) {
          const separator = budgetStr.includes(' to ') ? ' to ' : '-';
          const parts = preferences.budget.split(separator);

          if (parts.length === 2) {
            // Parse min value
            const minStr = parts[0].trim();
            const minClean = minStr.replace(/[₹,\s]/g, '');

            if (minStr.toLowerCase().includes('lakh')) {
              const numMatch = minClean.match(/\d+(\.\d+)?/);
              budgetMin = numMatch ? parseFloat(numMatch[0]) * 100000 : 0;
            } else if (minStr.toLowerCase().includes('crore') || minStr.toLowerCase().includes('cr')) {
              const numMatch = minClean.match(/\d+(\.\d+)?/);
              budgetMin = numMatch ? parseFloat(numMatch[0]) * 10000000 : 0;
            } else {
              budgetMin = parseFloat(minClean) || 0;
            }

            // Parse max value
            const maxStr = parts[1].trim();
            const maxClean = maxStr.replace(/[₹,\s]/g, '');

            if (maxStr.toLowerCase().includes('lakh')) {
              const numMatch = maxClean.match(/\d+(\.\d+)?/);
              budgetMax = numMatch ? parseFloat(numMatch[0]) * 100000 : 0;
            } else if (maxStr.toLowerCase().includes('crore') || maxStr.toLowerCase().includes('cr')) {
              const numMatch = maxClean.match(/\d+(\.\d+)?/);
              budgetMax = numMatch ? parseFloat(numMatch[0]) * 10000000 : 0;
            } else {
              budgetMax = parseFloat(maxClean) || 0;
            }
          }
        } else {
          // Single value with unit
          const cleanBudget = preferences.budget.replace(/[₹,\s]/g, '');

          if (budgetStr.includes('lakh')) {
            const numMatch = cleanBudget.match(/\d+(\.\d+)?/);
            if (numMatch) {
              const num = parseFloat(numMatch[0]);
              const budgetInRupees = num * 100000;
              // Show properties within budget range (not from 0)
              budgetMax = budgetInRupees;
              budgetMin = Math.max(0, budgetInRupees * 0.5); // Show properties from 50% to 100% of budget
            }
          } else if (budgetStr.includes('crore') || budgetStr.includes('cr')) {
            const numMatch = cleanBudget.match(/\d+(\.\d+)?/);
            if (numMatch) {
              const num = parseFloat(numMatch[0]);
              const budgetInRupees = num * 10000000;
              // Show properties within budget range (not from 0)
              budgetMax = budgetInRupees;
              budgetMin = Math.max(0, budgetInRupees * 0.5); // Show properties from 50% to 100% of budget
            }
          } else {
            // Plain number - show properties within range
            const num = parseFloat(cleanBudget);
            if (!isNaN(num)) {
              budgetMax = num;
              budgetMin = Math.max(0, num * 0.5); // Show properties from 50% to 100% of budget
            }
          }
        }
      }

      // Fallback to minBudget/maxBudget if available
      // Only use fallback if BOTH budgetMin AND budgetMax are 0 or invalid
      if ((budgetMin === 0 && budgetMax === 0) || (isNaN(budgetMin) && isNaN(budgetMax))) {
        if (preferences.minBudget && preferences.maxBudget) {
          // Check if minBudget and maxBudget are already numbers (in rupees)
          if (typeof preferences.minBudget === 'number' && typeof preferences.maxBudget === 'number') {
            // Already in rupees, use directly
            budgetMin = preferences.minBudget;
            budgetMax = preferences.maxBudget;
          } else {
            // Parse as strings with units
            const minBudgetStr = preferences.minBudget.toString().toLowerCase();
            const maxBudgetStr = preferences.maxBudget.toString().toLowerCase();

            // Parse minBudget with unit conversion
            const minClean = minBudgetStr.replace(/[₹,\s]/g, '');
            if (minBudgetStr.includes('lakh')) {
              const numMatch = minClean.match(/\d+(\.\d+)?/);
              budgetMin = numMatch ? parseFloat(numMatch[0]) * 100000 : 0;
            } else if (minBudgetStr.includes('crore') || minBudgetStr.includes('cr')) {
              const numMatch = minClean.match(/\d+(\.\d+)?/);
              budgetMin = numMatch ? parseFloat(numMatch[0]) * 10000000 : 0;
            } else {
              budgetMin = parseFloat(minClean) || 0;
            }

            // Parse maxBudget with unit conversion
            const maxClean = maxBudgetStr.replace(/[₹,\s]/g, '');
            if (maxBudgetStr.includes('lakh')) {
              const numMatch = maxClean.match(/\d+(\.\d+)?/);
              budgetMax = numMatch ? parseFloat(numMatch[0]) * 100000 : 0;
            } else if (maxBudgetStr.includes('crore') || maxBudgetStr.includes('cr')) {
              const numMatch = maxClean.match(/\d+(\.\d+)?/);
              budgetMax = numMatch ? parseFloat(numMatch[0]) * 10000000 : 0;
            } else {
              budgetMax = parseFloat(maxClean) || 0;
            }
          }
        }
      }

      // Split comma-separated strings in arrays
      let configurations = preferences.configurations || [];
      if (configurations.length > 0) {
        // If array contains comma-separated strings, split them
        configurations = configurations.flatMap((config: string) =>
          config.split(',').map((c: string) => c.trim()).filter((c: string) => c)
        );
      }

      let possessions = preferences.possessions || [];
      if (possessions.length > 0) {
        // If array contains comma-separated strings, split them
        possessions = possessions.flatMap((poss: string) =>
          poss.split(',').map((p: string) => p.trim()).filter((p: string) => p)
        );
      }

      const matchData = {
        budgetMin: Math.round(budgetMin),
        budgetMax: Math.round(budgetMax),
        locations: preferences.locations || [],
        configurations: configurations,
        possessions: possessions,
        propertyType: preferences.propertyType || '',
        sizeMin: preferences.sizeMin ? parseInt(preferences.sizeMin) : null,
        sizeMax: preferences.sizeMax ? parseInt(preferences.sizeMax) : null,
        includeProperties: includeProperties, // Request property details too
      };

      console.log('📤 Sending match data:', matchData);

      const response = await fetch('/api/match-properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchData),
      });

      if (!response.ok) {
        console.error('❌ Match API error:', response.status);
        return { count: 0, uniqueCount: 0, properties: [] };
      }

      const result = await response.json();
      console.log('📥 Match API response:', result);

      return {
        count: result.totalMatches || 0, // Return total dynamic count
        uniqueCount: result.matchedCount || 0, // Also return unique deduplicated count
        properties: result.properties || []
      };
    } catch (error) {
      console.error('❌ Error fetching matched property count:', error);
      return { count: 0, uniqueCount: 0, properties: [] };
    }
  };

  // Helper function to merge bot properties with API properties
  const buildMergedProperties = (requirement: Requirement, apiProperties: Property[]) => {
    const propertyMap = new Map();

    // Add bot-suggested properties first (from requirement.matchedProperties)
    const botProperties = requirement.matchedProperties || [];
    console.log('🤖 Bot properties count:', botProperties.length);

    botProperties.forEach((property: Property) => {
      const normalizedId = property._id || property.mongodbId ||
        `${property.title || property.ProjectName || ''}-${property.address || property.AreaName || ''}`.toLowerCase().replace(/\s+/g, '-');

      propertyMap.set(normalizedId, {
        ...property,
        id: property._id || property.mongodbId || normalizedId,
        source: 'bot'
      });
    });

    // Add API properties (merge with bot properties if same ID)
    apiProperties.forEach((property: Property) => {
      const normalizedId = property._id ||
        `${property.ProjectName || ''}-${property.AreaName || ''}`.toLowerCase().replace(/\s+/g, '-');

      // If property already exists from bot, merge to preserve user data (notes, status)
      const existingProperty = propertyMap.get(normalizedId);

      if (existingProperty) {
        // Merge bot property with API property, preserving user fields like note/status
        propertyMap.set(normalizedId, {
          ...existingProperty,  // Keep bot property data (including note/status)
          ...property,          // Override with fresh API data
          id: existingProperty.id || property._id || normalizedId,  // Preserve existing ID
          note: existingProperty.note,     // Explicitly preserve user note
          status: existingProperty.status, // Explicitly preserve user status
          source: 'bot+dynamic'
        });
      } else {
        // New property from API only
        propertyMap.set(normalizedId, {
          ...property,
          id: property._id || normalizedId,
          source: 'dynamic'
        });
      }
    });

    const mergedProperties = Array.from(propertyMap.values());
    console.log('✅ Merged properties:', {
      botCount: botProperties.length,
      apiCount: apiProperties.length,
      totalUnique: mergedProperties.length
    });

    return mergedProperties;
  };

  // Function to fetch ALL unique matched properties for a requirement
  const fetchAllMatchedProperties = async (requirement: Requirement) => {
    try {
      setLoadingAllProperties(true);

      // Use the requirement preferences to fetch all properties
      const preferences = requirement.preferences;

      // Convert budget to rupees if needed
      let budgetMin = 0;
      let budgetMax = 0;

      // Parse budget (reusing same logic as fetchMatchedPropertyCount)
      if (preferences.minBudget && preferences.maxBudget) {
        const minClean = preferences.minBudget.toString().replace(/[₹,\s]/g, '');
        const maxClean = preferences.maxBudget.toString().replace(/[₹,\s]/g, '');
        budgetMin = parseFloat(minClean) || 0;
        budgetMax = parseFloat(maxClean) || 0;
      } else if (preferences.budget) {
        const cleanBudget = preferences.budget.toString().replace(/[₹,\s]/g, '');
        const budgetNum = parseFloat(cleanBudget);

        if (!isNaN(budgetNum)) {
          const budgetMultiplier = preferences.budgetUnit === "Crores" ? 10000000 : 100000;
          const budgetInRupees = budgetNum * budgetMultiplier;
          budgetMax = budgetInRupees;
          budgetMin = Math.max(0, budgetInRupees * 0.5); // Show properties from 50% to 100% of budget
        }
      }

      // Parse configurations
      let configurations = [];
      if (preferences.configurations && Array.isArray(preferences.configurations)) {
        configurations = preferences.configurations;
      } else if (preferences.configuration) {
        configurations = preferences.configuration.split(',').map((c: string) => c.trim());
      }

      // Parse locations
      let locations = [];
      if (preferences.locations && Array.isArray(preferences.locations)) {
        locations = preferences.locations;
      } else if (preferences.location) {
        locations = preferences.location.split(',').map((l: string) => l.trim());
      }

      // Parse possessions
      let possessions = [];
      if (preferences.possessions && Array.isArray(preferences.possessions)) {
        possessions = preferences.possessions;
      } else if (preferences.possession || preferences.possessionTimeline) {
        const possessionStr = preferences.possession || preferences.possessionTimeline;
        possessions = possessionStr.split(',').map((p: string) => p.trim());
      }

      const matchData = {
        budgetMin,
        budgetMax,
        locations,
        configurations,
        possessions,
        propertyType: preferences.propertyType || '',
        sizeMin: preferences.sizeMin ? parseInt(preferences.sizeMin) : null,
        sizeMax: preferences.sizeMax ? parseInt(preferences.sizeMax) : null,
        includeProperties: true,
        returnAll: true, // Request all properties, not just limited set
      };

      console.log('🔍 Fetching ALL matched properties with data:', matchData);

      const response = await fetch('/api/match-properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchData),
      });

      if (!response.ok) {
        console.error('❌ Failed to fetch all properties');
        // Even if API fails, return bot properties if available
        const botOnlyProperties = buildMergedProperties(requirement, []);
        setAllMatchedProperties(botOnlyProperties);
        return botOnlyProperties;
      }

      const result = await response.json();
      console.log('✅ Fetched all unique properties from API:', result);

      // Keep the raw API properties without transformation
      const apiProperties = (result.properties || []).map((property: Property, index: number) => ({
        ...property, // Keep all original fields from API
        id: property._id || `property-${index}`, // Add ID for React key
      }));

      // Merge bot properties with API properties
      const mergedProperties = buildMergedProperties(requirement, apiProperties);
      setAllMatchedProperties(mergedProperties);
      return mergedProperties;
    } catch (error) {
      console.error('❌ Error fetching all matched properties:', error);
      // Even on error, return bot properties if available
      const botOnlyProperties = buildMergedProperties(requirement, []);
      setAllMatchedProperties(botOnlyProperties);
      return botOnlyProperties;
    } finally {
      setLoadingAllProperties(false);
    }
  };

  // Function to create requirement and get matched properties
  const createRequirementAndGetMatches = async (requirementData: Partial<Requirement>) => {
    try {
      console.log('Creating requirement with data:', requirementData);

      const response = await fetch('/api/create-requirement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requirementData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response:', result);

      if (result.success) {
        // Convert the API response format to match the expected format
        const formattedProperties = result.matchingProperties.map((property: Property, index: number) => ({
          id: property._id || `property-${index}`,
          title: property.ProjectName || 'Unknown Property',
          address: property.AreaName || 'Unknown Address',
          price: property.BaseProjectPrice ? `₹${property.BaseProjectPrice}` : 'Price not available',
          bedrooms: property.Configuration ? parseInt(property.Configuration.split('BHK')[0]) || 2 : 2,
          bathrooms: 2, // Default value
          sqft: property.Size || 'Size not available',
          match: Math.floor(Math.random() * 30) + 70, // Random match percentage between 70-100
          mongodbId: property._id,
          reraId: property.RERA_Number,
          // Additional data from our API
          configurations: property.configurations || [],
          builderName: property.BuilderName,
          possessionDate: property.Possession_Date,
          propertyType: property.property_type,
          gridScore: property.GRID_Score,
          amenities: {
            hospitals: property.hospitals_count || 0,
            schools: property.schools_count || 0,
            malls: property.shopping_malls_count || 0,
            restaurants: property.restaurants_count || 0
          }
        }));

        // Only update existing requirements if this is not a new requirement creation
        // For new requirements, we'll handle the update in handleAddRequirement
        if (requirementData.clientId) {
          // This is a new requirement creation, don't update existing requirements here
          // The update will be handled in handleAddRequirement
        } else {
          // Update the requirements with the new matched properties
          const updatedRequirements = requirements.map(req =>
            req.id === activeRequirementId
              ? { ...req, matchedProperties: formattedProperties }
              : req
          );
          setRequirements(updatedRequirements);

          // Save to localStorage
          if (id) {
            saveRequirementsToStorage(id, updatedRequirements);
          }

          // Show success toast
          toast({
            title: "Properties Found!",
            description: `Found ${result.totalMatches} matching properties for your requirement.`,
          });
        }

        return result;
      } else {
        throw new Error(result.error || 'Failed to create requirement');
      }
    } catch (error) {
      console.error('Error creating requirement:', error);
      toast({
        title: "Error",
        description: "Failed to create requirement. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Fetch area names when component mounts and when dialog opens
  useEffect(() => {
    fetchAreaNames();
  }, []);

  // Fetch area names when the add requirement dialog opens
  useEffect(() => {
    if (addReqDialog && areaNames.length === 0) {
      fetchAreaNames();
    }
  }, [addReqDialog]);

  // Check for new requirement results from the create-requirement API
  useEffect(() => {
    const newRequirementResults = localStorage.getItem('newRequirementResults');
    if (newRequirementResults) {
      try {
        const results = JSON.parse(newRequirementResults);
        console.log('Found new requirement results:', results);

        // Convert the API response format to match the expected format
        const formattedProperties = results.matchingProperties.map((property: Property, index: number) => ({
          id: property._id || `property-${index}`,
          title: property.ProjectName || 'Unknown Property',
          address: property.AreaName || 'Unknown Address',
          price: property.BaseProjectPrice ? `₹${property.BaseProjectPrice}` : 'Price not available',
          bedrooms: property.Configuration ? parseInt(property.Configuration.split('BHK')[0]) || 2 : 2,
          bathrooms: 2, // Default value
          sqft: property.Size || 'Size not available',
          match: Math.floor(Math.random() * 30) + 70, // Random match percentage between 70-100
          mongodbId: property._id,
          reraId: property.RERA_Number,
          // Additional data from our API
          configurations: property.configurations || [],
          builderName: property.BuilderName,
          possessionDate: property.Possession_Date,
          propertyType: property.property_type,
          gridScore: property.GRID_Score,
          amenities: {
            hospitals: property.hospitals_count || 0,
            schools: property.schools_count || 0,
            malls: property.shopping_malls_count || 0,
            restaurants: property.restaurants_count || 0
          }
        }));

        // Update the requirements with the new matched properties
        setRequirements(prev => prev.map(req =>
          req.id === activeRequirementId
            ? { ...req, matchedProperties: formattedProperties }
            : req
        ));

        // Show success toast
        toast({
          title: "Properties Found!",
          description: `Found ${results.totalMatches} matching properties for your requirement.`,
        });

        // Clear the localStorage to prevent showing the same results again
        localStorage.removeItem('newRequirementResults');

      } catch (error) {
        console.error('Error parsing new requirement results:', error);
      }
    }
  }, [activeRequirementId, toast]);

  // Function to parse bot suggested properties
  const parseBotProperties = (botData: string) => {
    console.log("Parsing bot data:", botData);
    const properties = [];

    // Debug the conditions
    const hasNumberedList = /^\d+\.\s+/m.test(botData); // Check for "1. " at start of line
    console.log("🔍 Checking format conditions:");
    console.log("  - Has numbered list (^1. ): ", hasNumberedList);
    console.log("  - Has '**': ", botData.includes("**"));
    console.log("  - Has '?': ", botData.includes("?"));
    console.log("  - Has '*': ", botData.includes("*"));
    console.log("  - Has ' - ' and 'BHK': ", botData.includes(" - ") && botData.includes("BHK"));

    // Check if this is the new format (contains numbered properties at start of line)
    if (hasNumberedList || botData.includes("**")) {
      // New format parsing
      const lines = botData.split('\n');
      let currentLocation = "";
      let propertyIndex = 0;

      lines.forEach((line, lineIndex) => {
        line = line.trim();

        // Extract location from headers like "**KONDAPUR PROPERTIES:**"
        if (line.includes('**') && line.includes('PROPERTIES:**')) {
          const locationMatch = line.match(/\*\*([^*]+)\s+PROPERTIES:\*\*/);
          if (locationMatch) {
            currentLocation = locationMatch[1];
            console.log("Found location:", currentLocation);
          }
        }

        // Parse numbered property entries like "1. Canny Utpala-2: ₹1.09-1.21 crores (1945-2160 sq ft)"
        const propertyMatch = line.match(/^\d+\.\s+([^:]+):\s+₹([^()]+)\s+\(([^)]+)\)/);
        if (propertyMatch) {
          const propertyName = propertyMatch[1].trim();
          const priceRange = propertyMatch[2].trim();
          const sizeRange = propertyMatch[3].trim();

          // Extract size information
          const sizeMatch = sizeRange.match(/(\d+)-(\d+)\s+sq\s+ft/);
          const avgSize = sizeMatch ? Math.round((parseInt(sizeMatch[1]) + parseInt(sizeMatch[2])) / 2) : 0;

          // Extract configuration from the original bot data context
          // Since the data mentions "3BHK properties", we'll use that as default
          const configMatch = botData.match(/(\d+BHK)/);
          const configuration = configMatch ? configMatch[1] : "3BHK";

          // Try to find RERA number or other unique identifier for this property
          // Look for RERA numbers in the format P01100003953
          const reraMatch = botData.match(/RERA:\s*([A-Z0-9]+)/);
          const reraId = reraMatch ? reraMatch[1] : null;

          const property = {
            id: `p${propertyIndex + 1}`,
            title: propertyName,
            address: currentLocation,
            price: `₹${priceRange}`,
            bedrooms: parseInt(configuration.replace('BHK', '')),
            bathrooms: parseInt(configuration.replace('BHK', '')),
            sqft: `${avgSize} sqft`,
            status: "Active",
            match: 95 - (propertyIndex * 5),
            image: "/api/placeholder/300/200",
            reraId: reraId, // Add RERA ID for potential external linking
            mongodbId: null // Add MongoDB ID field for direct property linking
          };

          properties.push(property);
          propertyIndex++;
          console.log("Added property:", property);
        }
      });
    } else if (botData.includes("?") && botData.includes("*")) {
      // New format with "? *PROPERTY_NAME*" or "? Field: value" pattern
      console.log("✅ Parsing question mark format property format");
      console.log("📊 Bot data length:", botData.length);
      const lines = botData.split('\n');
      console.log("📊 Total lines to parse:", lines.length);
      let currentProperty: any = null;
      let propertyIndex = 0;

      // Helper function to finalize current property
      const finalizeProperty = () => {
        if (currentProperty) {
          // Use Developer Name as title if no explicit title
          if (!currentProperty.title && currentProperty.developer) {
            currentProperty.title = currentProperty.developer;
            console.log(`📝 Using developer name as title: "${currentProperty.title}"`);
          }

          // Only add property if it has a title
          if (currentProperty.title) {
            // Set defaults for missing fields
            if (!currentProperty.address) currentProperty.address = "Location not specified";
            if (!currentProperty.price) currentProperty.price = "Price not specified";
            if (!currentProperty.sqft) currentProperty.sqft = "Size not specified";
            if (!currentProperty.developer) currentProperty.developer = "Developer not specified";
            if (!currentProperty.possession) currentProperty.possession = "Possession not specified";

            properties.push(currentProperty);
            console.log(`✅ Added property #${properties.length}:`, currentProperty.title);
          }
          currentProperty = null;
        }
      };

      lines.forEach((line, lineIndex) => {
        line = line.trim();

        // Blank lines signal property boundary
        if (!line) {
          finalizeProperty();
          return;
        }

        // Check if this is a line starting with "?"
        if (!line.startsWith('?')) return;

        // Property name format: "? *NAME*" (no colon in the content)
        const propertyNameMatch = line.match(/^\?\s*\*([^*:]+)\*\s*$/);

        if (propertyNameMatch) {
          // This is a property name - finalize previous and start new
          finalizeProperty();

          const propertyName = propertyNameMatch[1].trim();
          console.log(`🆕 Line ${lineIndex}: Starting property "${propertyName}"`);

          currentProperty = {
            id: `bot-property-${propertyIndex + 1}`,
            title: propertyName,
            address: "",
            price: "",
            bedrooms: 2,
            bathrooms: 2,
            sqft: "",
            status: "Active",
            match: 95 - (propertyIndex * 5),
            image: "/api/placeholder/300/200",
            reraId: null,
            mongodbId: null,
            developer: "",
            possession: "",
            configuration: ""
          };
          propertyIndex++;
        } else if (line.includes(':')) {
          // This is a field line: "? Field: value" or "? *Field: value*"
          // Start a new property if we don't have one yet
          if (!currentProperty) {
            console.log(`🆕 Line ${lineIndex}: Starting property from field`);
            currentProperty = {
              id: `bot-property-${propertyIndex + 1}`,
              title: "",
              address: "",
              price: "",
              bedrooms: 2,
              bathrooms: 2,
              sqft: "",
              status: "Active",
              match: 95 - (propertyIndex * 5),
              image: "/api/placeholder/300/200",
              reraId: null,
              mongodbId: null,
              developer: "",
              possession: "",
              configuration: ""
            };
            propertyIndex++;
          }

          // Parse the field
          const colonIndex = line.indexOf(':');
          const key = line.substring(0, colonIndex).replace('?', '').replace(/\*/g, '').trim();
          const value = line.substring(colonIndex + 1).trim();
          console.log(`📝 Field: ${key} = ${value}`);

          if (key === 'Developer Name') {
            currentProperty.developer = value;
          } else if (key === 'Location') {
            currentProperty.address = value;
          } else if (key === 'Type') {
            currentProperty.propertyType = value;
          } else if (key === 'Configuration') {
            currentProperty.configuration = value;
            const configMatch = value.match(/(\d+)\s*BHK/);
            if (configMatch) {
              const bhk = parseInt(configMatch[1]);
              currentProperty.bedrooms = bhk;
              currentProperty.bathrooms = bhk;
            }
          } else if (key === 'Size') {
            currentProperty.sqft = value;
          } else if (key === 'Possession') {
            currentProperty.possession = value;
          } else if (key === 'Base Project Price') {
            currentProperty.price = value;
          } else if (key === 'RERA') {
            currentProperty.reraId = value;
          } else if (key === 'Google Maps') {
            currentProperty.googleMapsUrl = value;
          }
        }
      });

      // Finalize the last property
      finalizeProperty();

      console.log(`✅✅ Total properties parsed: ${properties.length}`);
    } else if (botData.includes(" - ") && botData.includes("BHK")) {
      // Single line format like "PLATINUM VISTA-II BLOCK-A - 2BHK apartments in Manikonda with sizes ranging from 1160-1280 sqft, prices from ₹75.40L to ₹83.20L, possession March 2026, East/West/North facing options available"
      console.log("Parsing single line property format");

      // Extract property name (before the first " - ")
      const nameMatch = botData.match(/^([^-]+)\s*-\s*/);
      const propertyName = nameMatch ? nameMatch[1].trim() : "Unknown Property";

      // Extract configuration (BHK)
      const configMatch = botData.match(/(\d+BHK)/);
      const configuration = configMatch ? configMatch[1] : "2BHK";
      const bedrooms = parseInt(configuration.replace('BHK', ''));

      // Extract location
      const locationMatch = botData.match(/in\s+([^,]+)/);
      const location = locationMatch ? locationMatch[1].trim() : "Unknown Location";

      // Extract size range
      const sizeMatch = botData.match(/(\d+)-(\d+)\s+sqft/);
      const avgSize = sizeMatch ? Math.round((parseInt(sizeMatch[1]) + parseInt(sizeMatch[2])) / 2) : 1200;

      // Extract price range
      const priceMatch = botData.match(/₹([^L]+)L\s+to\s+₹([^L]+)L/);
      const priceRange = priceMatch ? `₹${priceMatch[1].trim()}L - ₹${priceMatch[2].trim()}L` : "₹75.40L - ₹83.20L";

      // Extract possession date
      const possessionMatch = botData.match(/(\w+\s+\d{4})/);
      const possession = possessionMatch ? possessionMatch[1] : "March 2026";

      const property = {
        id: "p1",
        title: propertyName,
        address: location,
        price: priceRange,
        bedrooms: bedrooms,
        bathrooms: bedrooms,
        sqft: `${avgSize} sqft`,
        status: "Active",
        match: 95,
        image: "/api/placeholder/300/200",
        reraId: null,
        mongodbId: null,
        possession: possession
      };

      properties.push(property);
      console.log("Added single line property:", property);
    } else {
      // Old format parsing (keeping for backward compatibility)
      const propertyBlocks = botData.split(/\n\n+/);
      console.log("Property blocks:", propertyBlocks);

      propertyBlocks.forEach((block, index) => {
        // Skip empty blocks or header text
        if (!block.trim() || block.includes("Other 4BHK Properties in Tellapur")) {
          return;
        }

        console.log(`Processing block ${index}:`, block);
        const lines = block.split('\n');
        const property: any = {
          id: `p${index + 1}`,
          status: "Active",
          match: 95 - (index * 5), // Decreasing match percentage
          image: "/api/placeholder/300/200",
          mongodbId: null // Add MongoDB ID field for direct property linking
        };

        lines.forEach(line => {
          line = line.trim();
          if (line.includes('**') && line.includes('**')) {
            // Extract property name
            const nameMatch = line.match(/\*\*([^*]+)\*\*/);
            if (nameMatch) {
              property.title = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
              console.log("Found property title:", property.title);
            }
          } else if (line.includes('Location:')) {
            property.address = line.split('Location:')[1].trim();
            console.log("Found address:", property.address);
          } else if (line.includes('Size:')) {
            property.sqft = line.split('Size:')[1].trim();
            console.log("Found size:", property.sqft);
          } else if (line.includes('Base Project Price:')) {
            property.price = line.split('Base Project Price:')[1].trim();
            console.log("Found price:", property.price);
          } else if (line.includes('Configuration:')) {
            const config = line.split('Configuration:')[1].trim();
            if (config.includes('4BHK')) {
              property.bedrooms = 4;
              property.bathrooms = 4;
            } else if (config.includes('3BHK')) {
              property.bedrooms = 3;
              property.bathrooms = 3;
            } else if (config.includes('2BHK')) {
              property.bedrooms = 2;
              property.bathrooms = 2;
            } else if (config.includes('1BHK')) {
              property.bedrooms = 1;
              property.bathrooms = 1;
            }
            console.log("Found config:", config, "bedrooms:", property.bedrooms);
          } else if (line.includes('RERA:')) {
            // Extract RERA number for potential external linking
            const reraMatch = line.match(/RERA:\s*([A-Z0-9]+)/);
            if (reraMatch) {
              property.reraId = reraMatch[1];
              console.log("Found RERA ID:", property.reraId);
            }
          }
        });

        if (property.title) {
          properties.push(property);
          console.log("Added property:", property);
        }
      });
    }

    console.log("Final parsed properties:", properties);
    return properties;
  };

  // Function to fetch property ID from MongoDB
  const fetchPropertyId = async (propertyName: string): Promise<string | null> => {
    try {
      const response = await fetch(`http://localhost:3000/api/property-id/${encodeURIComponent(propertyName)}`);
      const data = await response.json();

      if (data.found && data.propertyId) {
        console.log(`Found MongoDB ID for ${propertyName}:`, data.propertyId);
        return data.propertyId;
      } else {
        console.log(`No MongoDB ID found for ${propertyName}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching property ID for ${propertyName}:`, error);
      return null;
    }
  };

  // Function to fetch all cached properties from MongoDB
  const fetchAllProperties = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/properties-cache');
      const data = await response.json();

      if (data.properties) {
        console.log('Fetched all properties from cache:', data.properties.length);
        return data.properties;
      }
      return [];
    } catch (error) {
      console.error('Error fetching all properties:', error);
      return [];
    }
  };

  // Function to refresh properties cache
  const refreshPropertiesCache = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/properties-cache/refresh', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.message) {
        console.log('Properties cache refreshed:', data.message);
        toast({
          title: "Cache Refreshed",
          description: `Refreshed ${data.totalCount} properties in cache.`,
        });
      }
    } catch (error) {
      console.error('Error refreshing properties cache:', error);
      toast({
        title: "Cache Refresh Failed",
        description: "Could not refresh properties cache.",
        variant: "destructive",
      });
    }
  };

  // Function to fetch MongoDB IDs for multiple properties at once
  const fetchPropertyIds = async (properties: any[]): Promise<any[]> => {
    try {
      console.log("🔍 fetchPropertyIds called with:", properties.length, "properties");
      console.log("🔍 Property titles:", properties.map(p => p.title));

      const propertyNames = properties.map(p => p.title);
      const response = await fetch('/api/property-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ propertyNames }),
      });

      const data = await response.json();
      console.log("✅ fetchPropertyIds response:", data);

      if (data.results) {
        // Create a map of property names to MongoDB IDs
        const idMap = new Map();
        data.results.forEach((result: any) => {
          if (result.found && result.propertyId) {
            idMap.set(result.propertyName, result.propertyId);
          }
        });

        // Update properties with MongoDB IDs and project names
        const updatedProperties = properties.map(property => {
          const result = data.results.find((r: any) => r.propertyName === property.title);
          return {
            ...property,
            mongodbId: result?.propertyId || null,
            projectName: result?.projectName || null
          };
        });

        console.log("✅ Updated properties with IDs:", updatedProperties);
        return updatedProperties;
      }

      console.log("⚠️ No results in response, returning original properties");
      return properties;
    } catch (error) {
      console.error('❌ Error fetching property IDs:', error);
      console.log("⚠️ Returning original properties despite error");
      return properties;
    }
  };

  // Function to fetch MongoDB IDs for all requirements' matched properties
  const fetchMongoDBIdsForAllRequirements = async (requirementsList: any[]): Promise<any[]> => {
    try {
      console.log("Starting to fetch MongoDB IDs for all requirements...");

      // Collect all properties from all requirements that don't have MongoDB IDs
      const allPropertiesNeedingIds: any[] = [];
      const requirementPropertyMap = new Map(); // Map to track which properties belong to which requirements

      requirementsList.forEach((requirement, reqIndex) => {
        if (requirement.matchedProperties && requirement.matchedProperties.length > 0) {
          requirement.matchedProperties.forEach((property: any, propIndex: number) => {
            // Only add properties that don't have mongodbId
            if (!property.mongodbId) {
              allPropertiesNeedingIds.push(property);
              requirementPropertyMap.set(`${reqIndex}-${propIndex}`, {
                requirementId: requirement.id,
                propertyIndex: propIndex,
                propertyTitle: property.title
              });
            }
          });
        }
      });

      console.log(`Found ${allPropertiesNeedingIds.length} properties needing MongoDB IDs`);

      if (allPropertiesNeedingIds.length === 0) {
        console.log("No properties need MongoDB IDs, returning original requirements");
        return requirementsList;
      }

      // Extract property names for the API call
      const propertyNames = allPropertiesNeedingIds.map(p => p.title);
      console.log("Property names to fetch IDs for:", propertyNames);

      // Call the API to get MongoDB IDs for all properties
      const response = await fetch('http://localhost:3000/api/property-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ propertyNames }),
      });

      const data = await response.json();
      console.log("API response for property IDs:", data);

      if (data.results) {
        // Create a map of property names to MongoDB IDs
        const idMap = new Map();
        data.results.forEach((result: any) => {
          if (result.found && result.propertyId) {
            idMap.set(result.propertyName, result.propertyId);
          }
        });

        // Update all requirements with the fetched MongoDB IDs
        const updatedRequirements = requirementsList.map(requirement => {
          if (requirement.matchedProperties && requirement.matchedProperties.length > 0) {
            const updatedProperties = requirement.matchedProperties.map((property: Property) => {
              // If property doesn't have mongodbId, try to get it from the API response
              if (!property.mongodbId) {
                const mongoId = idMap.get(property.title);
                if (mongoId) {
                  console.log(`Updated property "${property.title}" with MongoDB ID: ${mongoId}`);
                  return { ...property, mongodbId: mongoId };
                }
              }
              return property;
            });

            return { ...requirement, matchedProperties: updatedProperties };
          }
          return requirement;
        });

        console.log("Updated requirements with MongoDB IDs:", updatedRequirements);
        return updatedRequirements;
      }

      return requirementsList;
    } catch (error) {
      console.error('Error fetching MongoDB IDs for all requirements:', error);
      return requirementsList;
    }
  };

  // Debug useEffect to log requirements changes
  useEffect(() => {
    console.log("🔍 Requirements state changed:");
    console.log("Debug - requirements:", requirements);
    console.log("Debug - activeRequirement matchedProperties:", requirements.find(r => r.id === activeRequirementId)?.matchedProperties);
    console.log("Debug - matchedProperties length:", requirements.find(r => r.id === activeRequirementId)?.matchedProperties?.length || 0);
  }, [requirements, activeRequirementId]);

  // Fetch client data by mobile number
  useEffect(() => {
    const fetchClientData = async () => {
      try {
        // Try to fetch Zoho leads
        const userData = localStorage.getItem('userData');
        let userEmail = '';
        if (userData) {
          try {
            const user = JSON.parse(userData);
            userEmail = user.email || '';
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        }

        // Fetch Zoho leads for the current user
        if (
          userEmail === 'vaishnavig@relai.world' ||
          userEmail === 'angaleenaj@relai.world' ||
          userEmail === 'angelinak@relai.world' ||
          userEmail === 'subscriptions@relai.world' ||
          userEmail === 'sindhua@relai.world' ||
          userEmail === 'sindhu@relai.world'
        ) {
          try {
            const zohoResponse = await fetch(`/api/zoho/leads?ownerEmail=${encodeURIComponent(userEmail)}`);
            if (zohoResponse.ok) {
              const zohoData = await zohoResponse.json();
              if (zohoData.success && zohoData.leads) {
                // Find the specific lead by ID
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const lead = zohoData.leads.find((l: Record<string, any>) => l.id === id);
                if (lead) {
                  console.log('📋 Found Zoho lead with preferences:', lead.preferences);

                  // Map Zoho lead to client data format
                  const mappedClient = {
                    id: lead.id,
                    name: lead.leadName,
                    phone: lead.mobile,
                    mobile: lead.mobile,
                    email: lead.email || 'Not provided',
                    role: 'Lead',
                    status: 'Active',
                    location: 'Unknown Location',
                    lastContact: new Date().toISOString(),
                    preferences: lead.preferences || {},
                    priority: 'Medium',
                    matchedProperties: 0,
                  };

                  setClientData(mappedClient);

                  // Load saved location from localStorage
                  const clientLocations: Record<string, string> = JSON.parse(localStorage.getItem('clientLocations') || '{}');
                  const savedLocation = clientLocations[id!];
                  if (savedLocation) {
                    setLocationValue(savedLocation);
                  }

                  // Load existing requirements from API instead of localStorage
                  let storedRequirements: Requirement[] | null = null;
                  try {
                    console.log('📡 Fetching requirements from API for client:', id);
                    const reqResponse = await fetch(`/api/requirements/${id}`);
                    if (reqResponse.ok) {
                      const reqData = await reqResponse.json();
                      if (reqData.success && reqData.requirements) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        storedRequirements = reqData.requirements.map((req: any) => ({
                          id: req.id,
                          name: req.name,
                          preferences: req.preferences,
                          matchedProperties: req.matchedProperties || [],
                          shortlistedProperties: req.shortlistedProperties || [],
                          siteVisits: req.siteVisits || []
                        }));
                        console.log(`✅ Loaded ${storedRequirements.length} requirements from API`);
                      }
                    }
                  } catch (error) {
                    console.error('❌ Error fetching requirements from API:', error);
                  }

                  // If we have existing requirements from the database, use them
                  if (storedRequirements && storedRequirements.length > 0) {
                    console.log('✅ Using existing requirements from database:', storedRequirements);

                    // Merge Zoho matchedPropertyCount into database requirements if available
                    if (lead.preferences?.matchedPropertyCount) {
                      const zohoCount = lead.preferences.matchedPropertyCount;
                      console.log(`🔄 Merging Zoho matchedPropertyCount (${zohoCount}) into requirement`);

                      // Find Requirement 2 (if it exists) and update its matchedCount
                      const req2Index = storedRequirements.findIndex(r => r.id === 2);
                      if (req2Index !== -1) {
                        storedRequirements[req2Index].matchedCount = parseInt(zohoCount) || 0;
                        if (!storedRequirements[req2Index].preferences.matchedPropertyCount) {
                          storedRequirements[req2Index].preferences.matchedPropertyCount = zohoCount;
                        }
                      }
                    }

                    setRequirements(storedRequirements);
                    return; // Exit early since we have requirements from the database
                  }

                  // If we have Zoho preferences but no saved requirements, create default structure
                  // Always create Requirement 1 with no preferences and Requirement 2 with Zoho preferences
                  if (lead.preferences) {
                    const zohoPrefs = lead.preferences;

                    // Check if there are any valid Zoho preference values
                    const hasValidZohoData =
                      (zohoPrefs.budget && zohoPrefs.budget.trim() !== '') ||
                      (zohoPrefs.propertyType && zohoPrefs.propertyType.trim() !== '') ||
                      (zohoPrefs.possessionTimeline && zohoPrefs.possessionTimeline.trim() !== '') ||
                      (zohoPrefs.location && zohoPrefs.location.trim() !== '') ||
                      (zohoPrefs.configuration && zohoPrefs.configuration.trim() !== '') ||
                      (zohoPrefs.propertySize && zohoPrefs.propertySize.trim() !== '');

                    // Create Requirement 1 with default "Not specified" preferences
                    const defaultRequirement = {
                      id: 1,
                      name: "Requirement 1",
                      preferences: {
                        budget: "Not specified",
                        location: "Not specified",
                        possession: "Not specified",
                        minBudget: "Not specified",
                        maxBudget: "Not specified",
                        floorMin: "Not specified",
                        floorMax: "Not specified",
                        sizeMin: "Not specified",
                        sizeMax: "Not specified",
                        configuration: "Not specified",
                        propertyType: "Not specified",
                        gatedType: "Not specified",
                        facing: "Not specified",
                        buildingType: "Not specified",
                        financingOption: "Not specified",
                        includeGSTRegistration: false
                      },
                      matchedProperties: [],
                      shortlistedProperties: [],
                      siteVisits: [],
                    };

                    if (hasValidZohoData) {
                      console.log('✅ Found valid Zoho preferences, creating Requirement 2');

                      // Check if requirements were recently manually updated (within last 5 seconds)
                      const timeSinceLastUpdate = Date.now() - lastManualUpdateRef.current;
                      const recentlyUpdated = timeSinceLastUpdate < 5000;

                      if (recentlyUpdated) {
                        console.log('⏭️ Skipping Zoho sync - requirements were manually updated recently');
                        return;
                      }

                      // Parse budget if it exists
                      let minBudget = '';
                      let maxBudget = '';
                      if (zohoPrefs.budget && zohoPrefs.budget.trim() !== '') {
                        const budgetStr = zohoPrefs.budget.toString().trim();
                        minBudget = budgetStr;
                        maxBudget = budgetStr;
                      }

                      // Parse property size if it exists
                      let sizeMin = '';
                      let sizeMax = '';
                      if (zohoPrefs.propertySize && zohoPrefs.propertySize.trim() !== '') {
                        const sizeStr = zohoPrefs.propertySize.toString().trim();
                        sizeMin = sizeStr;
                        sizeMax = sizeStr;
                      }

                      // Create Requirement 2 with Zoho preferences
                      const zohoRequirement = {
                        id: 2,
                        name: "Requirement 2",
                        preferences: {
                          budget: zohoPrefs.budget || '',
                          location: zohoPrefs.location || '',
                          possession: zohoPrefs.possessionTimeline || '',
                          possessionTimeline: zohoPrefs.possessionTimeline || '',
                          minBudget: minBudget,
                          maxBudget: maxBudget,
                          floorMin: '',
                          floorMax: '',
                          sizeMin: sizeMin,
                          sizeMax: sizeMax,
                          configuration: zohoPrefs.configuration || '',
                          propertyType: zohoPrefs.propertyType || '',
                          gatedType: '',
                          facing: '',
                          buildingType: '',
                          matchedPropertyCount: zohoPrefs.matchedPropertyCount || '',
                          financingOption: zohoPrefs.financingOption || '',
                          includeGSTRegistration: zohoPrefs.includeGSTRegistration || false,
                        },
                        matchedProperties: [],
                        shortlistedProperties: [],
                        siteVisits: [],
                      } as Requirement;

                      // Set both requirements, preserving any existing bot properties in Requirement 1
                      setRequirements(prev => {
                        const existingReq1 = prev.find(r => r.id === 1);
                        const req1WithBotProps = existingReq1
                          ? { ...defaultRequirement, matchedProperties: existingReq1.matchedProperties || [] }
                          : defaultRequirement;
                        return [req1WithBotProps, zohoRequirement];
                      });

                      // Fetch matched properties for Requirement 2
                      const refreshPreferences = {
                        budget: zohoPrefs.budget || '',
                        budgetUnit: 'Lakhs',
                        locations: (zohoPrefs.location || '').split(',').map((l: string) => l.trim()).filter((l: string) => l),
                        configurations: (zohoPrefs.configuration || '').split(',').map((c: string) => c.trim()).filter((c: string) => c),
                        possessions: (zohoPrefs.possessionTimeline || '').split(',').map((p: string) => p.trim()).filter((p: string) => p),
                        propertyType: zohoPrefs.propertyType || '',
                        sizeMin: sizeMin,
                        sizeMax: sizeMax
                      };

                      // Fetch matched properties
                      fetchMatchedPropertyCount(refreshPreferences, true).then(({ count, uniqueCount, properties }) => {
                        console.log(`✅ Fetched matched properties for Requirement 2: count=${count}, uniqueCount=${uniqueCount}, properties=${properties.length}`);

                        // Format Supabase matched properties to the standard format
                        const formattedMatchedProperties = properties.map((property: Property, index: number) => ({
                          id: property._id || `property-${index}`,
                          title: property.ProjectName || 'Unknown Property',
                          address: property.AreaName || 'Unknown Address',
                          price: property["Base Project Price"] ? `₹${(parseInt(property["Base Project Price"]) / 10000000).toFixed(2)} Cr` : 'Price not available',
                          bedrooms: property.BHK || property.Configuration || 'N/A',
                          bathrooms: 2,
                          sqft: property["SQ FEET"] || property.Size || 'N/A',
                          match: Math.floor(Math.random() * 30) + 70,
                          mongodbId: property._id,
                          reraId: property.RERA_Number,
                          configurations: property.configurations || [],
                          builderName: property.BuilderName,
                          possessionDate: property.Possession_Date,
                          propertyType: property.property_type,
                          gridScore: property.GRID_Score,
                          amenities: {
                            hospitals: property.hospitals_count || 0,
                            schools: property.schools_count || 0,
                            malls: property.shopping_malls_count || 0,
                            restaurants: property.restaurants_count || 0
                          }
                        }));

                        // Preserve Requirement 1's bot properties using functional state update
                        setRequirements(prev => {
                          const existingReq1 = prev.find(r => r.id === 1);
                          const existingReq2 = prev.find(r => r.id === 2);
                          const req1WithBotProps = existingReq1
                            ? { ...defaultRequirement, matchedProperties: existingReq1.matchedProperties || [] }
                            : defaultRequirement;

                          // Only update matchedProperties if we have new properties, otherwise preserve existing
                          const updatedZohoRequirement = {
                            ...zohoRequirement,
                            matchedCount: count,
                            uniqueMatchedCount: uniqueCount,
                            // Preserve existing matchedProperties if the new array is empty
                            matchedProperties: formattedMatchedProperties.length > 0
                              ? formattedMatchedProperties
                              : (existingReq2?.matchedProperties || []),
                            matchedPropertyNames: properties
                          };

                          return [req1WithBotProps, updatedZohoRequirement];
                        });
                      }).catch(error => {
                        console.error('❌ Failed to fetch matched properties for Requirement 2:', error);
                      });
                    } else {
                      // No valid Zoho data, just show Requirement 1
                      // Preserve any existing bot properties using functional state update
                      setRequirements(prev => {
                        const existingReq1 = prev.find(r => r.id === 1);
                        const req1WithBotProps = existingReq1
                          ? { ...defaultRequirement, matchedProperties: existingReq1.matchedProperties || [] }
                          : defaultRequirement;
                        return [req1WithBotProps];
                      });
                    }
                  }

                  return; // Exit early since we found the lead
                }
              }
            }
          } catch (zohoError) {
            console.log("Error fetching Zoho lead:", zohoError);
          }
        }

        // First try to fetch from the new API endpoint
        try {
          const response = await fetch(`https://eb0a6bf7-6007-49ab-bbab-edea52a79228-00-2cb09bf1fa7pu.sisko.replit.dev/api/clients/${id}`);
          if (response.ok) {
            const data = await response.json();
            setClientData(data);

            // Load saved location from localStorage
            const clientLocations = JSON.parse(localStorage.getItem('clientLocations') || '{}');
            const savedLocation = clientLocations[id!];
            if (savedLocation) {
              setLocationValue(savedLocation);
            }

            // Load existing requirements from API first
            let storedRequirements: Requirement[] | null = null;
            try {
              console.log('📡 Fetching requirements from API for client:', id);
              const reqResponse = await fetch(`/api/requirements/${id}`);
              if (reqResponse.ok) {
                const reqData = await reqResponse.json();
                if (reqData.success && reqData.requirements) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  storedRequirements = reqData.requirements.map((req: any) => ({
                    id: req.id,
                    name: req.name,
                    preferences: req.preferences,
                    matchedProperties: req.matchedProperties || [],
                    shortlistedProperties: req.shortlistedProperties || [],
                    siteVisits: req.siteVisits || []
                  }));
                  console.log(`✅ Loaded ${storedRequirements.length} requirements from API`);
                }
              }
            } catch (error) {
              console.error('❌ Error fetching requirements from API:', error);
            }

            // If we have existing requirements from the database, use them
            if (storedRequirements && storedRequirements.length > 0) {
              console.log('✅ Using existing requirements from database:', storedRequirements);
              setRequirements(storedRequirements);
              return; // Exit early since we have requirements from the database
            }

            // Update requirements ONLY from API response (no localStorage)
            console.log("🔍 API Response data:", {
              hasPreferences: !!data.preferences,
              hasMatchedProperties: !!data.matchedProperties,
              hasBotSuggestedProperties: !!data["Bot Suggested Properties"],
              matchedPropertiesType: typeof data.matchedProperties,
              isArray: Array.isArray(data.matchedProperties),
              length: data.matchedProperties?.length
            });
            console.log("Found client preferences:", data.preferences);
            console.log("Found client matchedProperties:", data.matchedProperties);

            // Parse Bot Suggested Properties if available
            let botParsedProperties: Property[] = [];
            console.log("🔍 Checking Bot Suggested Properties field...");
            console.log("🔍 Field exists?", !!data["Bot Suggested Properties"]);
            console.log("🔍 Field length:", data["Bot Suggested Properties"]?.length || 0);
            console.log("🔍 First 200 chars:", data["Bot Suggested Properties"]?.substring(0, 200));

            if (data["Bot Suggested Properties"] && data["Bot Suggested Properties"].trim() !== "") {
              console.log("✅✅✅ Found Bot Suggested Properties field, parsing...");
              console.log("📄 Full content:", data["Bot Suggested Properties"]);
              botParsedProperties = parseBotProperties(data["Bot Suggested Properties"]);
              console.log("✅ Parsed bot properties count:", botParsedProperties.length);
              console.log("✅ Parsed bot properties:", botParsedProperties);

              // Fetch MongoDB IDs for bot properties
              const propertiesWithIds = await fetchPropertyIds(botParsedProperties);
              console.log("✅ Bot properties with MongoDB IDs:", propertiesWithIds);
              botParsedProperties = propertiesWithIds;
            } else {
              console.log("❌ No Bot Suggested Properties found or field is empty");
            }

            // Get database matched properties and format them for the UI
            const rawMatchedProperties = (data.matchedProperties && Array.isArray(data.matchedProperties))
              ? data.matchedProperties
              : [];

            // Format matched properties to match the expected UI format
            const formattedMatchedProperties = rawMatchedProperties.map((property: Property, index: number) => ({
              id: property._id || `property-${index}`,
              title: property.ProjectName || 'Unknown Property',
              address: property.AreaName || 'Unknown Address',
              price: property['Base Project Price'] ? `₹${(parseInt(property['Base Project Price']) / 10000000).toFixed(2)} Cr` : 'Price not available',
              bedrooms: property.BHK || '2',
              bathrooms: 2,
              sqft: property['SQ FEET'] || 'Size not available',
              match: Math.floor(Math.random() * 30) + 70,
              mongodbId: property._id,
              reraId: property.RERA_Number,
              configurations: property.configurations || [],
              builderName: property.BuilderName,
              possessionDate: property.Possession_Date,
              propertyType: property.property_type,
              gridScore: property.GRID_Score,
              amenities: {
                hospitals: property.hospitals_count || 0,
                schools: property.schools_count || 0,
                malls: property.shopping_malls_count || 0,
                restaurants: property.restaurants_count || 0
              }
            }));

            console.log("✅ Formatted matched properties:", formattedMatchedProperties.length, "properties");

            // Create requirements structure:
            // Requirement 1: Always has "Not specified" preferences
            // Requirement 2: Has client preferences with matched properties
            const updatedRequirements = [];

            // Always create Requirement 1 with default "Not specified" preferences
            // Include bot-suggested properties if they were parsed
            updatedRequirements.push({
              id: 1,
              name: "Requirement 1",
              preferences: {
                budget: "Not specified",
                location: "Not specified",
                possession: "Not specified",
                minBudget: "Not specified",
                maxBudget: "Not specified",
                floorMin: "Not specified",
                floorMax: "Not specified",
                sizeMin: "Not specified",
                sizeMax: "Not specified",
                configuration: "Not specified",
                propertyType: "Not specified",
                gatedType: "Not specified",
                facing: "Not specified",
                buildingType: "Not specified",
                financingOption: "Not specified",
                includeGSTRegistration: false
              },
              matchedProperties: botParsedProperties,
              shortlistedProperties: [],
              siteVisits: []
            });

            // Check if client has preferences
            const hasClientPreferences = data.preferences && (
              data.preferences.budget ||
              data.preferences.location ||
              data.preferences.configuration ||
              data.preferences.type
            );

            // Create Requirement 2 with client preferences if they exist
            if (hasClientPreferences) {
              console.log("✅ Creating Requirement 2 with client preferences");

              const req2 = {
                id: 2,
                name: "Requirement 2",
                preferences: {
                  budget: data.preferences?.budget || "Not specified",
                  location: data.preferences?.location || "Not specified",
                  possession: data.preferences?.possessionTimeline || "Not specified",
                  minBudget: data.preferences?.minBudget || "Not specified",
                  maxBudget: data.preferences?.maxBudget || "Not specified",
                  floorMin: data.preferences?.minFloor || "Not specified",
                  floorMax: data.preferences?.maxFloor || "Not specified",
                  sizeMin: data.preferences?.minSize || "Not specified",
                  sizeMax: data.preferences?.maxSize || "Not specified",
                  configuration: data.preferences?.configuration || "Not specified",
                  propertyType: data.preferences?.type || "Not specified",
                  gatedType: data.preferences?.communityType || "Not specified",
                  facing: data.preferences?.facing || "Not specified",
                  buildingType: data.preferences?.buildingType || "Not specified",
                  financingOption: data.preferences?.financingOption || "Not specified",
                  includeGSTRegistration: !!data.preferences?.includeGSTRegistration
                },
                matchedProperties: [],
                shortlistedProperties: [],
                siteVisits: []
              };

              updatedRequirements.push(req2);

              // Always fetch matched properties for Requirement 2
              console.log("🔄 Fetching matched properties for Requirement 2...");

              // Build preferences for API call
              // Normalize budget string by replacing all dash variants with ASCII hyphen
              const originalBudget = data.preferences?.budget || '';
              const normalizedBudget = originalBudget
                .replace(/–/g, '-')  // en dash
                .replace(/—/g, '-')  // em dash
                .replace(/\u2013/g, '-')  // Unicode en dash
                .replace(/\u2014/g, '-');  // Unicode em dash

              const budgetStr = normalizedBudget.toLowerCase();

              // Check if this is a range (contains dash or "to")
              const isRange = budgetStr.includes('-') || budgetStr.includes(' to ');

              // Detect budget unit from the budget string, but only for single values (not ranges)
              let budgetUnit: 'Crores' | 'Lakhs' | undefined = undefined;

              // Only set budgetUnit if it's NOT a range
              if (!isRange) {
                // Detect unit from the budget string
                // Match 'crore', 'crores', 'cr', 'cr.', 'cr ' (word boundary aware)
                if (/\b(crore|crores|cr\.?)\b/.test(budgetStr)) {
                  budgetUnit = 'Crores';
                } else if (/\b(lakh|lakhs|lac)\b/.test(budgetStr)) {
                  budgetUnit = 'Lakhs';
                }
              }

              console.log('🔍 Budget parsing:', {
                originalBudget: originalBudget,
                normalizedBudget: normalizedBudget,
                detectedUnit: budgetUnit,
                isRange: isRange
              });

              const fetchPreferences = {
                budget: normalizedBudget, // Use normalized budget string
                budgetUnit: budgetUnit, // undefined for ranges, Crores/Lakhs for single values
                locations: (data.preferences?.location || '').split(',').map((l: string) => l.trim()).filter((l: string) => l),
                configurations: (data.preferences?.configuration || '').split(',').map((c: string) => c.trim()).filter((c: string) => c),
                possessions: (data.preferences?.possessionTimeline || '').split(',').map((p: string) => p.trim()).filter((p: string) => p),
                propertyType: data.preferences?.type || '',
                sizeMin: data.preferences?.minSize || '',
                sizeMax: data.preferences?.maxSize || ''
              };

              // Set the initial requirements state immediately
              setRequirements(updatedRequirements);

              // Fetch matched properties and update when done
              fetchMatchedPropertyCount(fetchPreferences, true).then(({ count, uniqueCount, properties }) => {
                console.log(`✅ Fetched ${properties.length} matched properties for Requirement 2`);

                const formattedProps = properties.map((property: Property, index: number) => ({
                  id: property._id || `property-${index}`,
                  title: property.ProjectName || 'Unknown Property',
                  address: property.AreaName || 'Unknown Address',
                  price: property["Base Project Price"] ? `₹${(parseInt(property["Base Project Price"]) / 10000000).toFixed(2)} Cr` : 'Price not available',
                  bedrooms: property.BHK || property.Configuration || 'N/A',
                  bathrooms: 2,
                  sqft: property["SQ FEET"] || property.Size || 'N/A',
                  match: Math.floor(Math.random() * 30) + 70,
                  mongodbId: property._id,
                  reraId: property.RERA_Number,
                  configurations: property.configurations || [],
                  builderName: property.BuilderName,
                  possessionDate: property.Possession_Date,
                  propertyType: property.property_type,
                  gridScore: property.GRID_Score,
                  amenities: {
                    hospitals: property.hospitals_count || 0,
                    schools: property.schools_count || 0,
                    malls: property.shopping_malls_count || 0,
                    restaurants: property.restaurants_count || 0
                  }
                }));

                // Update Requirement 2 with matched properties
                // Preserve Requirement 1's bot properties by using the current state
                setRequirements(prev => [
                  prev[0] || updatedRequirements[0],
                  {
                    ...req2,
                    matchedProperties: formattedProps,
                    matchedCount: count,
                    uniqueMatchedCount: uniqueCount
                  }
                ]);
              }).catch(error => {
                console.error('❌ Failed to fetch matched properties:', error);
              });
            } else {
              // No client preferences, just set Requirement 1
              setRequirements(updatedRequirements);
            }

            return; // Exit early if we successfully fetched from new API
          }
        } catch (newApiError) {
          console.log("New API endpoint not available, falling back to webhook handler");
        }

        // Fallback to webhook handler
        const response = await fetch(API_ENDPOINTS.CLIENTS);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Find the specific client by mobile number
        const client = data.find((c: ClientData) => c.mobile === id);

        if (client) {
          setClientData(client);

          // Load saved location from localStorage
          const clientLocations = JSON.parse(localStorage.getItem('clientLocations') || '{}');
          const savedLocation = clientLocations[id!];
          if (savedLocation) {
            setLocationValue(savedLocation);
          }

          // Create requirements from fallback API data
          // Parse bot suggested properties first if they exist
          if (client["Bot Suggested Properties"] && client["Bot Suggested Properties"].trim() !== "") {
            console.log("Found bot suggested properties:", client["Bot Suggested Properties"]);
            const botProperties = parseBotProperties(client["Bot Suggested Properties"]);
            console.log("Parsed bot properties:", botProperties);

            // Fetch MongoDB IDs for all properties
            const propertiesWithIds = await fetchPropertyIds(botProperties);
            console.log("Properties with MongoDB IDs:", propertiesWithIds);

            const botUpdatedRequirements = [{
              id: 1,
              name: "Requirement 1",
              matchedProperties: propertiesWithIds,
              preferences: {
                budget: client.budget || "Not specified",
                location: client.location || "Not specified",
                possession: client.possession_date || "Not specified",
                minBudget: client.minBudget || "Not specified",
                maxBudget: client.maxBudget || "Not specified",
                floorMin: client.minFloor || "Not specified",
                floorMax: client.maxFloor || "Not specified",
                sizeMin: client.minSize || "Not specified",
                sizeMax: client.maxSize || "Not specified",
                configuration: client.configuration || "Not specified",
                propertyType: client.propertyType || client.property_type || "Not specified",
                gatedType: client.communityType || "Not specified",
                facing: client.facing || "Not specified",
                buildingType: client.buildingType || "Not specified"
              },
              shortlistedProperties: [],
              siteVisits: []
            }];
            setRequirements(botUpdatedRequirements);
            console.log("✅ Updated requirements with bot properties:", botUpdatedRequirements);
            console.log("✅ Matched properties count:", botUpdatedRequirements[0]?.matchedProperties?.length);
          } else {
            console.log("No bot suggested properties found or empty string");
            const updatedRequirements = [{
              id: 1,
              name: "Requirement 1",
              matchedProperties: [],
              preferences: {
                budget: client.budget || "Not specified",
                location: client.location || "Not specified",
                possession: client.possession_date || "Not specified",
                minBudget: client.minBudget || "Not specified",
                maxBudget: client.maxBudget || "Not specified",
                floorMin: client.minFloor || "Not specified",
                floorMax: client.maxFloor || "Not specified",
                sizeMin: client.minSize || "Not specified",
                sizeMax: client.maxSize || "Not specified",
                configuration: client.configuration || "Not specified",
                propertyType: client.propertyType || client.property_type || "Not specified",
                gatedType: client.communityType || "Not specified",
                facing: client.facing || "Not specified",
                buildingType: client.buildingType || "Not specified"
              },
              shortlistedProperties: [],
              siteVisits: []
            }];
            setRequirements(updatedRequirements);
          }
        } else {
          // Client not found
          toast({
            title: "Error",
            description: "Client not found.",
            variant: "destructive",
          });
          navigate("/clients");
        }
      } catch (error) {
        console.error("Failed to fetch client data:", error);
        toast({
          title: "Error",
          description: "Could not fetch client data.",
          variant: "destructive",
        });
        navigate("/clients");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchClientData();
    }
  }, [id, navigate, toast]);

  // Function to create bot property in database
  const createBotPropertyInDatabase = async (property: Property) => {
    try {
      console.log('Creating bot property in database:', property);

      // Create a new property object with the bot property data
      const newProperty = {
        ProjectName: property.title,
        RERA_Number: property.reraId,
        AreaName: property.address || "Unknown",
        PriceSheet: property.price ? parseInt(property.price.replace(/[^\d]/g, '')) : 0,
        Possession_Date: property.possession || "Not specified",
        property_type: "Apartment", // Default type
        configurations: [{
          type: property.configuration || `${property.bedrooms}BHK`,
          sizeRange: property.sqft ? property.sqft.replace(/[^\d]/g, '') : "0",
          sizeUnit: "Sq ft",
          BaseProjectPrice: property.price ? property.price.replace(/[^\d]/g, '') : "0"
        }],
        BuilderName: property.developer || "Unknown",
        // Add other required fields with defaults
        google_place_id: "",
        google_place_name: property.title,
        google_place_address: property.address || "Unknown",
        google_place_location: { lat: 0, lng: 0 },
        google_place_rating: 0,
        google_place_user_ratings_total: 0,
        google_maps_url: "",
        google_place_raw_data: {},
        hospitals_count: 0,
        shopping_malls_count: 0,
        schools_count: 0,
        restaurants_count: 0,
        restaurants_above_4_stars_count: 0,
        supermarkets_count: 0,
        it_offices_count: 0,
        metro_stations_count: 0,
        railway_stations_count: 0,
        nearest_hospitals: [],
        nearest_shopping_malls: [],
        nearest_schools: [],
        nearest_restaurants: [],
        high_rated_restaurants: [],
        nearest_supermarkets: [],
        nearest_it_offices: [],
        nearest_metro_station: [],
        nearest_railway_station: [],
        nearest_orr_access: [],
        connectivity_score: 0,
        amenities_score: 0,
        amenities_raw_data: 0,
        amenities_updated_at: new Date().toISOString(),
        mobile_google_map_url: "",
        GRID_Score: 0
      };

      // Send to backend to create in database
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProperty)
      });

      if (response.ok) {
        const createdProperty = await response.json();
        toast({
          title: "Success",
          description: `${property.title} has been created in database.`,
        });

        // Refresh client data to get updated mongodbId
        // We need to trigger a re-fetch by calling the API again
        if (id) {
          try {
            const refreshResponse = await fetch(`https://eb0a6bf7-6007-49ab-bbab-edea52a79228-00-2cb09bf1fa7pu.sisko.replit.dev/api/clients/${id}`);
            if (refreshResponse.ok) {
              const refreshedData = await refreshResponse.json();
              setClientData(refreshedData);
            }
          } catch (refreshError) {
            console.error('Error refreshing client data:', refreshError);
          }
        }

        return createdProperty;
      } else {
        const errorData = await response.json();
        console.error('Failed to create property:', errorData);

        toast({
          title: "Error",
          description: `Failed to create ${property.title} in database.`,
          variant: "destructive"
        });

        return null;
      }
    } catch (error) {
      console.error('Error creating bot property:', error);

      toast({
        title: "Error",
        description: `Failed to create ${property.title} in database.`,
        variant: "destructive",
      });

      return null;
    }
  };

  // Load location from localStorage when client ID changes (but NOT requirements)
  useEffect(() => {
    if (id) {
      // Load saved location from localStorage
      const clientLocations = JSON.parse(localStorage.getItem('clientLocations') || '{}');
      const savedLocation = clientLocations[id];
      if (savedLocation) {
        setLocationValue(savedLocation);
      }
    }
  }, [id]);

  const handleLocationEdit = () => {
    setIsEditingLocation(true);
  };

  const handleLocationSave = () => {
    setIsEditingLocation(false);

    // Save to localStorage
    const clientLocations = JSON.parse(localStorage.getItem('clientLocations') || '{}');
    clientLocations[id!] = locationValue;
    localStorage.setItem('clientLocations', JSON.stringify(clientLocations));

    toast({
      title: "Location Updated",
      description: "Client location has been updated successfully.",
    });
  };

  const handleLocationCancel = () => {
    setIsEditingLocation(false);
    // Reset to the last known good location if available, otherwise to default
    const clientLocations: Record<string, string> = JSON.parse(localStorage.getItem('clientLocations') || '{}');
    setLocationValue(clientLocations[id!] || "Unknown Location");
  };

  const handleDeleteRequirement = async (requirement: Requirement) => {
    // Show confirmation dialog
    if (!window.confirm(`Are you sure you want to delete ${requirement.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Get the requirement ID (number) from the requirement
      const requirementId = requirement.id;

      if (!requirementId || !id) {
        toast({
          title: "Error",
          description: "Cannot delete requirement: ID not found",
          variant: "destructive",
        });
        return;
      }

      // Call the delete API endpoint with new format: /api/requirements/:clientId/:requirementNumber
      const response = await fetch(`${API_ENDPOINTS.REQUIREMENTS}/${id}/${requirementId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete requirement');
      }

      // Remove the requirement from the local state
      const updatedRequirements = requirements.filter(req => req.id !== requirement.id);
      setRequirements(updatedRequirements);

      // Switch to Requirement 1 if we deleted the active one
      if (activeRequirementId === requirement.id) {
        setActiveRequirementId(1);
      }

      toast({
        title: "Requirement Deleted",
        description: `${requirement.name} has been deleted successfully.`,
      });

    } catch (error) {
      console.error('Error deleting requirement:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete requirement",
        variant: "destructive",
      });
    }
  };

  const handleAddRequirement = async () => {
    try {
      // Validate required fields - accept either singular location or locations array
      const hasLocation = newReqPreferences.location ||
        (newReqPreferences.locations && newReqPreferences.locations.length > 0);

      if (!hasLocation) {
        toast({
          title: "Validation Error",
          description: "Please select at least one preferred location.",
          variant: "destructive",
        });
        return;
      }

      if (!newReqPreferences.minBudget && !newReqPreferences.budget) {
        toast({
          title: "Validation Error",
          description: "Please enter a budget amount.",
          variant: "destructive",
        });
        return;
      }

      setIsCreatingRequirement(true);

      // Handle budget calculation - support both old and new formats
      let budgetMin, budgetMax;

      if (newReqPreferences.minBudget && newReqPreferences.maxBudget) {
        // New format: direct min/max values
        budgetMin = parseInt(newReqPreferences.minBudget);
        budgetMax = parseInt(newReqPreferences.maxBudget);
      } else if (newReqPreferences.budget) {
        // Old format: budget with unit
        const budgetMultiplier = newReqPreferences.budgetUnit === "Crores" ? 10000000 : 100000;
        const budgetInRupees = parseFloat(newReqPreferences.budget) * budgetMultiplier;
        budgetMax = budgetInRupees;
        budgetMin = Math.max(0, budgetInRupees * 0.5); // Show properties from 50% to 100% of budget
      } else {
        // Fallback defaults
        budgetMin = 0;
        budgetMax = 100000000; // 10 crores default
      }

      // Handle locations - support both singular location and locations array
      const locationString = newReqPreferences.locations && newReqPreferences.locations.length > 0
        ? newReqPreferences.locations.join(', ')
        : newReqPreferences.location || '';

      // Prepare the requirement data for the API
      const requirementData = {
        budgetMin: Math.round(budgetMin),
        budgetMax: Math.round(budgetMax),
        possession: newReqPreferences.possessions && newReqPreferences.possessions.length > 0
          ? newReqPreferences.possessions.join(', ')
          : newReqPreferences.possessionTimeline || '',
        configuration: newReqPreferences.configurations && newReqPreferences.configurations.length > 0
          ? newReqPreferences.configurations.map(c => c.replace(/\s+/g, '')).join(', ')
          : newReqPreferences.configuration?.replace(/\s+/g, '') || '', // Remove spaces from configuration
        locations: locationString,
        propertyType: newReqPreferences.propertyType || '',
        communityType: newReqPreferences.gatedType === "Gated" ? "Gated Community" : newReqPreferences.gatedType || '',
        facing: newReqPreferences.facing || '',
        buildingType: newReqPreferences.buildingType === "High rise" ? "High-rise" : newReqPreferences.buildingType || '',
        floorMin: parseInt(newReqPreferences.floorMin) || 0,
        floorMax: parseInt(newReqPreferences.floorMax) || 100,
        sizeMin: newReqPreferences.sizeMin ? parseInt(newReqPreferences.sizeMin) : null,
        sizeMax: newReqPreferences.sizeMax ? parseInt(newReqPreferences.sizeMax) : null,
        clientId: id, // Add client ID to the requirement data
        financingOption: newReqPreferences.financingOption || '',
        includeGSTRegistration: newReqPreferences.includeGSTRegistration || false
      };

      // Debug: Log the exact data being sent
      console.log('🔍 Sending requirement data to API:', JSON.stringify(requirementData, null, 2));

      // Call the create-requirement API to get matches
      const result = await createRequirementAndGetMatches(requirementData);

      // Debug log to see the API response structure
      console.log('🔍 API Response structure:', JSON.stringify(result, null, 2));

      if (result.success) {
        // Create new requirement with the API response data
        const newId = requirements.length > 0 ? Math.max(...requirements.map(r => r.id)) + 1 : 1;

        // Convert the API response format to match the expected format
        const formattedProperties = result.matchingProperties.map((property: Property, index: number) => ({
          id: property._id || `property-${index}`,
          title: property.ProjectName || 'Unknown Property',
          address: property.AreaName || 'Unknown Address',
          price: property.BaseProjectPrice ? `₹${property.BaseProjectPrice}` : 'Price not available',
          bedrooms: property.Configuration ? parseInt(property.Configuration.split('BHK')[0]) || 2 : 2,
          bathrooms: 2, // Default value
          sqft: property.Size || 'Size not available',
          match: Math.floor(Math.random() * 30) + 70, // Random match percentage between 70-100
          mongodbId: property._id,
          reraId: property.RERA_Number,
          // Additional data from our API
          configurations: property.configurations || [],
          builderName: property.BuilderName,
          possessionDate: property.Possession_Date,
          propertyType: property.property_type,
          gridScore: property.GRID_Score,
          amenities: {
            hospitals: property.hospitals_count || 0,
            schools: property.schools_count || 0,
            malls: property.shopping_malls_count || 0,
            restaurants: property.restaurants_count || 0
          }
        }));

        // Debug log to see how properties are formatted with mongodbId
        console.log('🔍 Formatted properties with mongodbId:', formattedProperties.map(p => ({ title: p.title, mongodbId: p.mongodbId, _id: p._id })));

        // Fetch matched property count and details from Supabase
        console.log('🔍 Fetching Supabase matched count and property details...');
        const { count: totalMatches, uniqueCount: uniqueMatches, properties: matchedProperties } = await fetchMatchedPropertyCount(newReqPreferences);
        console.log('✅ Total matches:', totalMatches);
        console.log('✅ Unique matches:', uniqueMatches);
        console.log('✅ Matched properties:', matchedProperties);

        // Format Supabase matched properties to the standard format
        const formattedMatchedProperties = matchedProperties.map((property: Property, index: number) => ({
          id: property._id || `property-${index}`,
          title: property.ProjectName || 'Unknown Property',
          address: property.AreaName || 'Unknown Address',
          price: property["Base Project Price"] ? `₹${(parseInt(property["Base Project Price"]) / 10000000).toFixed(2)} Cr` : 'Price not available',
          bedrooms: property.BHK || property.Configuration || 'N/A',
          bathrooms: 2,
          sqft: property["SQ FEET"] || property.Size || 'N/A',
          match: Math.floor(Math.random() * 30) + 70,
          mongodbId: property._id,
          reraId: property.RERA_Number,
          configurations: property.configurations || [],
          builderName: property.BuilderName,
          possessionDate: property.Possession_Date,
          propertyType: property.property_type,
          gridScore: property.GRID_Score,
          amenities: {
            hospitals: property.hospitals_count || 0,
            schools: property.schools_count || 0,
            malls: property.shopping_malls_count || 0,
            restaurants: property.restaurants_count || 0
          }
        }));

        const newRequirement = {
          id: newId,
          name: `Requirement ${newId}`,
          preferences: { ...newReqPreferences },
          matchedProperties: formattedMatchedProperties, // Use formatted Supabase properties
          shortlistedProperties: [],
          siteVisits: [],
          matchedCount: totalMatches, // Add total dynamic count
          uniqueMatchedCount: uniqueMatches, // Add unique deduplicated count
          matchedPropertyNames: matchedProperties, // Add property details for display (backward compatibility)
        };

        const updatedRequirements = [...requirements, newRequirement];
        setRequirements(updatedRequirements);
        setActiveRequirementId(newId);
        setAddReqDialog(false);

        // Mark that requirements were manually updated
        lastManualUpdateRef.current = Date.now();

        // Save to localStorage
        if (id) {
          saveRequirementsToStorage(id, updatedRequirements);
        }

        // No need to fetch MongoDB IDs - they're already included in the API response!

        toast({
          title: "Requirement Created Successfully",
          description: `Requirement ${newId} has been created. ${totalMatches} properties matched (showing top ${uniqueMatches} unique properties).`
        });

        // Update Zoho Lead with the requirement preferences before resetting
        try {
          const budgetText = `₹${newReqPreferences.budget} ${newReqPreferences.budgetUnit}`;
          const propertySizeText = newReqPreferences.sizeMin && newReqPreferences.sizeMax
            ? `${newReqPreferences.sizeMin} - ${newReqPreferences.sizeMax} SqFt`
            : '';

          console.log('📊 Sending matchedPropertyCount to Zoho:', uniqueMatches);
          console.log('📊 Type of uniqueMatches:', typeof uniqueMatches);

          const zohoUpdateResponse = await fetch(`/api/zoho/leads/${id}/preferences`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              budget: budgetText,
              propertyType: newReqPreferences.propertyType || '',
              possessionTimeline: newReqPreferences.possessions.length > 0 ? newReqPreferences.possessions.join(', ') : newReqPreferences.possessionTimeline || '',
              location: newReqPreferences.locations.join(', ') || '',
              configuration: newReqPreferences.configurations.length > 0 ? newReqPreferences.configurations.join(', ') : newReqPreferences.configuration || '',
              propertySize: propertySizeText,
              financingOption: newReqPreferences.financingOption,
              includeGSTRegistration: newReqPreferences.includeGSTRegistration,
              matchedPropertyCount: uniqueMatches
            })
          });

          const zohoResult = await zohoUpdateResponse.json();

          if (zohoResult.success) {
            console.log('✅ Zoho lead updated successfully:', zohoResult);
          } else {
            console.warn('⚠️ Failed to update Zoho lead:', zohoResult);
          }
        } catch (zohoError) {
          console.error('❌ Error updating Zoho lead:', zohoError);
          // Don't show error to user since the requirement was created successfully
        }

        // Reset form after successful creation and Zoho update
        setNewReqPreferences({
          budget: "",
          budgetUnit: "Crores",
          financingOption: "Loan option",
          includeGSTRegistration: false,
          location: "",
          locations: [],
          possession: "",
          possessions: [],
          possessionTimeline: "Not decided yet",
          budgetRange: "Not decided yet",
          minBudget: "",
          maxBudget: "",
          floorMin: "",
          floorMax: "",
          sizeMin: "",
          sizeMax: "",
          configuration: "",
          configurations: [],
          propertyType: "",
          gatedType: "",
          facing: "",
          buildingType: ""
        });
      }
    } catch (error) {
      console.error('Error creating requirement:', error);
      toast({
        title: "Error",
        description: "Failed to create requirement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingRequirement(false);
    }
  };

  // Function to open edit dialog with pre-filled data
  const handleEditRequirement = (req: Requirement) => {
    console.log('📝 Editing requirement:', req);
    console.log('📝 Preferences:', req.preferences);

    // Parse budget from the stored format
    let budgetAmount = "";
    let budgetUnit: "Crores" | "Lakhs" = "Crores";

    if (req.preferences.budget) {
      const budgetStr = req.preferences.budget.toString();
      const croreMatch = budgetStr.match(/(\d+\.?\d*)\s*(Cr|Crore)/i);
      const lakhMatch = budgetStr.match(/(\d+\.?\d*)\s*(L|Lakh)/i);

      if (croreMatch) {
        budgetAmount = croreMatch[1];
        budgetUnit = "Crores";
      } else if (lakhMatch) {
        budgetAmount = lakhMatch[1];
        budgetUnit = "Lakhs";
      } else if (req.preferences.minBudget && req.preferences.maxBudget) {
        // Calculate from minBudget/maxBudget
        const avgBudget = (parseInt(req.preferences.minBudget) + parseInt(req.preferences.maxBudget)) / 2;
        if (avgBudget >= 10000000) {
          budgetAmount = (avgBudget / 10000000).toFixed(1);
          budgetUnit = "Crores";
        } else {
          budgetAmount = (avgBudget / 100000).toFixed(1);
          budgetUnit = "Lakhs";
        }
      }
    }

    // Parse locations
    const locations = req.preferences.locations && req.preferences.locations.length > 0
      ? req.preferences.locations
      : (req.preferences.location ? req.preferences.location.split(',').map((l: string) => l.trim()) : []);

    // Parse configurations
    const configurations = req.preferences.configurations && req.preferences.configurations.length > 0
      ? req.preferences.configurations
      : (req.preferences.configuration ? req.preferences.configuration.split(',').map((c: string) => c.trim()) : []);

    // Parse possessions
    const possessions = req.preferences.possessions && req.preferences.possessions.length > 0
      ? req.preferences.possessions
      : (req.preferences.possessionTimeline ? req.preferences.possessionTimeline.split(',').map((p: string) => p.trim()) : []);

    // Parse size values - handle both direct values and propertySize format
    let sizeMin = "";
    let sizeMax = "";

    // Check if sizeMin/sizeMax contain range format like "1500 - 1800 SqFt"
    if (req.preferences.sizeMin && typeof req.preferences.sizeMin === 'string') {
      const sizeMinMatch = req.preferences.sizeMin.match(/(\d+)\s*-\s*(\d+)/);
      if (sizeMinMatch) {
        // It's a range, extract the first number
        sizeMin = sizeMinMatch[1];
        sizeMax = sizeMinMatch[2];
      } else {
        // It's just a number
        const numMatch = req.preferences.sizeMin.match(/(\d+)/);
        if (numMatch) {
          sizeMin = numMatch[1];
        }
      }
    }

    // If we didn't get sizeMax from sizeMin, check sizeMax field
    if (!sizeMax && req.preferences.sizeMax && typeof req.preferences.sizeMax === 'string') {
      const sizeMaxMatch = req.preferences.sizeMax.match(/(\d+)\s*-\s*(\d+)/);
      if (sizeMaxMatch) {
        // It's a range, extract the second number if we don't have it
        if (!sizeMin) sizeMin = sizeMaxMatch[1];
        sizeMax = sizeMaxMatch[2];
      } else {
        // It's just a number
        const numMatch = req.preferences.sizeMax.match(/(\d+)/);
        if (numMatch) {
          sizeMax = numMatch[1];
        }
      }
    }

    // If still empty, try propertySize field
    if ((!sizeMin || !sizeMax) && req.preferences.propertySize) {
      const sizeMatch = req.preferences.propertySize.match(/(\d+)\s*-\s*(\d+)/);
      if (sizeMatch) {
        sizeMin = sizeMatch[1];
        sizeMax = sizeMatch[2];
      }
    }

    console.log('📐 Parsed size values:', { sizeMin, sizeMax, originalSizeMin: req.preferences.sizeMin, originalSizeMax: req.preferences.sizeMax });

    setEditingRequirementId(req.id);
    setNewReqPreferences({
      budget: budgetAmount,
      budgetUnit: budgetUnit,
      financingOption: req.preferences.financingOption || "Loan option",
      includeGSTRegistration: req.preferences.includeGSTRegistration || false,
      location: req.preferences.location || "",
      locations: locations,
      possession: req.preferences.possession || "",
      possessions: possessions,
      possessionTimeline: req.preferences.possessionTimeline || "Not decided yet",
      budgetRange: req.preferences.budgetRange || "Not decided yet",
      minBudget: req.preferences.minBudget || "",
      maxBudget: req.preferences.maxBudget || "",
      floorMin: req.preferences.floorMin || "",
      floorMax: req.preferences.floorMax || "",
      sizeMin: sizeMin,
      sizeMax: sizeMax,
      configuration: req.preferences.configuration || "",
      configurations: configurations,
      propertyType: req.preferences.propertyType || "",
      gatedType: req.preferences.gatedType || "",
      facing: req.preferences.facing || "",
      buildingType: req.preferences.buildingType || "",
    });
    setAddReqDialog(true);
  };

  // Function to update existing requirement
  const handleUpdateRequirement = async () => {
    if (!editingRequirementId) return;

    try {
      // Validate required fields - accept either singular location or locations array
      const hasLocation = newReqPreferences.location ||
        (newReqPreferences.locations && newReqPreferences.locations.length > 0);

      if (!hasLocation) {
        toast({
          title: "Validation Error",
          description: "Please select at least one preferred location.",
          variant: "destructive",
        });
        return;
      }

      if (!newReqPreferences.budget) {
        toast({
          title: "Validation Error",
          description: "Please enter a budget amount.",
          variant: "destructive",
        });
        return;
      }

      setIsCreatingRequirement(true);

      // Convert budget to rupees based on unit
      const budgetMultiplier = newReqPreferences.budgetUnit === "Crores" ? 10000000 : 100000;
      const budgetInRupees = parseFloat(newReqPreferences.budget) * budgetMultiplier;
      // Show properties within budget range (not from 0)
      const budgetMax = budgetInRupees;
      const budgetMin = Math.max(0, budgetInRupees * 0.5); // Show properties from 50% to 100% of budget

      // Fetch matched property count and details from Supabase
      console.log('🔍 Fetching Supabase matched count and property details for updated requirement...');
      const { count: totalMatches, uniqueCount: uniqueMatches, properties: matchedProperties } = await fetchMatchedPropertyCount(newReqPreferences);
      console.log('✅ Total matches:', totalMatches);
      console.log('✅ Unique matches:', uniqueMatches);
      console.log('✅ Matched properties:', matchedProperties);

      // Format Supabase matched properties to the standard format
      const formattedMatchedProperties = matchedProperties.map((property: Property, index: number) => ({
        id: property._id || `property-${index}`,
        title: property.ProjectName || 'Unknown Property',
        address: property.AreaName || 'Unknown Address',
        price: property["Base Project Price"] ? `₹${(parseInt(property["Base Project Price"]) / 10000000).toFixed(2)} Cr` : 'Price not available',
        bedrooms: property.BHK || property.Configuration || 'N/A',
        bathrooms: 2,
        sqft: property["SQ FEET"] || property.Size || 'N/A',
        match: Math.floor(Math.random() * 30) + 70,
        mongodbId: property._id,
        reraId: property.RERA_Number,
        configurations: property.configurations || [],
        builderName: property.BuilderName,
        possessionDate: property.Possession_Date,
        propertyType: property.property_type,
        gridScore: property.GRID_Score,
        amenities: {
          hospitals: property.hospitals_count || 0,
          schools: property.schools_count || 0,
          malls: property.shopping_malls_count || 0,
          restaurants: property.restaurants_count || 0
        }
      }));

      // Update the requirement in state
      const updatedRequirements = requirements.map(req =>
        req.id === editingRequirementId
          ? {
            ...req,
            preferences: {
              ...newReqPreferences,
              minBudget: Math.round(budgetMin).toString(),
              maxBudget: Math.round(budgetMax).toString(),
              budget: `₹${newReqPreferences.budget} ${newReqPreferences.budgetUnit}`,
              location: newReqPreferences.locations.join(', '),
              possessionTimeline: newReqPreferences.possessions.length > 0
                ? newReqPreferences.possessions.join(', ')
                : newReqPreferences.possessionTimeline,
              configuration: newReqPreferences.configurations.length > 0
                ? newReqPreferences.configurations.join(', ')
                : newReqPreferences.configuration,
            },
            matchedCount: totalMatches, // Update with total dynamic count
            uniqueMatchedCount: uniqueMatches, // Store unique deduplicated count separately
            matchedProperties: formattedMatchedProperties, // Update with formatted properties
            matchedPropertyNames: matchedProperties, // Update matched property details (backward compatibility)
          }
          : req
      );

      setRequirements(updatedRequirements);

      // Mark that requirements were manually updated
      lastManualUpdateRef.current = Date.now();

      // Save to localStorage
      if (id) {
        saveRequirementsToStorage(id, updatedRequirements);
      }

      // Update Zoho Lead with the updated requirement preferences
      try {
        const budgetText = `₹${newReqPreferences.budget} ${newReqPreferences.budgetUnit}`;
        const propertySizeText = newReqPreferences.sizeMin && newReqPreferences.sizeMax
          ? `${newReqPreferences.sizeMin} - ${newReqPreferences.sizeMax} SqFt`
          : '';

        const zohoUpdateResponse = await fetch(`/api/zoho/leads/${id}/preferences`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            budget: budgetText,
            propertyType: newReqPreferences.propertyType || '',
            possessionTimeline: newReqPreferences.possessions.length > 0
              ? newReqPreferences.possessions.join(', ')
              : newReqPreferences.possessionTimeline || '',
            location: newReqPreferences.locations.join(', ') || '',
            configuration: newReqPreferences.configurations.length > 0
              ? newReqPreferences.configurations.join(', ')
              : newReqPreferences.configuration || '',
            propertySize: propertySizeText,
            financingOption: newReqPreferences.financingOption,
            includeGSTRegistration: newReqPreferences.includeGSTRegistration,
            matchedPropertyCount: uniqueMatches
          })
        });

        const zohoResult = await zohoUpdateResponse.json();

        if (zohoResult.success) {
          console.log('✅ Zoho lead updated successfully:', zohoResult);
        } else {
          console.warn('⚠️ Failed to update Zoho lead:', zohoResult);
        }
      } catch (zohoError) {
        console.error('❌ Error updating Zoho lead:', zohoError);
      }

      toast({
        title: "Requirement Updated",
        description: `The requirement has been updated successfully. ${totalMatches} properties matched (showing top ${uniqueMatches} unique properties).`,
      });

      setAddReqDialog(false);
      setEditingRequirementId(null);

      // Reset form
      setNewReqPreferences({
        budget: "",
        budgetUnit: "Crores",
        financingOption: "Loan option",
        includeGSTRegistration: false,
        location: "",
        locations: [],
        possession: "",
        possessions: [],
        possessionTimeline: "Not decided yet",
        budgetRange: "Not decided yet",
        minBudget: "",
        maxBudget: "",
        floorMin: "",
        floorMax: "",
        sizeMin: "",
        sizeMax: "",
        configuration: "",
        configurations: [],
        propertyType: "",
        gatedType: "",
        facing: "",
        buildingType: ""
      });
    } catch (error) {
      console.error('Error updating requirement:', error);
      toast({
        title: "Error",
        description: "Failed to update requirement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingRequirement(false);
    }
  };

  // Function to manually set bot suggested properties
  const setBotProperties = () => {
    const botPropertiesData = `? *MY HOME SUPERNOVA*
? Developer Name: My Home Constructions Pvt. Ltd.
? Location: Tellapur
? Configuration: 3BHK
? Size: 2226 sq ft
? Possession: Dec 2026
? Base Project Price: ₹1.78 crores
? RERA: P01100006733
? Google Maps: [https://www.google.com/maps/search/?api=1&query=17.487851,78.3048909](https://www.google.com/maps/search/?api=1&query=17.487851,78.3048909)

? *VISION HIERARCHY*
? Developer Name: Vision Avenues Pvt Ltd
? Location: Tellapur
? Configuration: 3BHK
? Size: 2470 - 2800 sq ft
? Possession: March 2026
? Base Project Price: ₹1.85 - ₹2.10 crores
? RERA: P01100005703
? Google Maps: [https://www.google.com/maps/search/?api=1&query=17.4883471,78.3023028](https://www.google.com/maps/search/?api=1&query=17.4883471,78.3023028)

? *AADYA THE GRAND*
? Developer Name: AADYA PROPERTIES
? Location: Tellapur
? Configuration: 3BHK
? Size: 2200 sq ft
? Possession: Dec 2025
? Base Project Price: ₹1.65 crores
? RERA: P01100003740
? Google Maps: [https://www.google.com/maps/search/?api=1&query=17.498864,78.304856](https://www.google.com/maps/search/?api=1&query=17.498864,78.304856)`;

    // Update clientData with bot properties
    setClientData(prev => ({
      ...prev,
      "Bot Suggested Properties": botPropertiesData
    }));

    // Parse and set the properties immediately
    const botProperties = parseBotProperties(botPropertiesData);
    console.log("Parsed bot properties:", botProperties);

    // Update requirements with the parsed properties
    const updatedRequirements = requirements.map(req =>
      req.id === 1
        ? {
          ...req,
          matchedProperties: botProperties,
          preferences: {
            ...req.preferences,
            budget: clientData.budget || "Not specified",
            location: clientData.location || "Not specified",
            possession: clientData.possession_date || "Not specified",
            minBudget: clientData.minBudget || "Not specified",
            maxBudget: clientData.maxBudget || "Not specified",
            floorMin: clientData.minFloor || "Not specified",
            floorMax: clientData.maxFloor || "Not specified",
            sizeMin: clientData.minSize || "Not specified",
            sizeMax: clientData.maxSize || "Not specified",
            configuration: clientData.configuration || "Not specified",
            propertyType: clientData.propertyType || clientData.property_type || "Not specified",
            gatedType: clientData.communityType || "Not specified",
            facing: clientData.facing || "Not specified",
            buildingType: clientData.buildingType || "Not specified"
          }
        }
        : req
    );
    setRequirements(updatedRequirements);

    // Save to localStorage
    if (id) {
      saveRequirementsToStorage(id, updatedRequirements);
    }

    toast({
      title: "Bot Properties Added",
      description: "Bot suggested properties have been added and parsed successfully.",
    });
  };

  // Function to manually test bot properties parsing
  const debugBotProperties = () => {
    if (clientData && clientData["Bot Suggested Properties"]) {
      console.log("=== DEBUG: Bot Properties Parsing ===");
      console.log("Raw bot data:", clientData["Bot Suggested Properties"]);
      const parsed = parseBotProperties(clientData["Bot Suggested Properties"]);
      console.log("Parsed properties:", parsed);
      console.log("=== END DEBUG ===");

      toast({
        title: "Debug Complete",
        description: `Parsed ${parsed.length} properties. Check console for details.`,
      });
    } else {
      toast({
        title: "No Bot Properties",
        description: "No bot suggested properties found for this client.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Loading client data...</h2>
        </div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Client not found</h2>
          <Button onClick={() => navigate("/clients")}>Back to Clients</Button>
        </div>
      </div>
    );
  }

  const getMatchColor = (match: number) => {
    if (match >= 90) return "default";
    if (match >= 80) return "secondary";
    return "outline";
  };

  const handleShortList = (property: Property) => {
    const updatedRequirements = requirements.map(r =>
      r.id === activeRequirementId
        ? {
          ...r,
          shortlistedProperties: [...r.shortlistedProperties, property],
          matchedProperties: r.matchedProperties.filter(p => p.id !== property.id),
        }
        : r
    );
    setRequirements(updatedRequirements);

    // Save to localStorage
    if (id) {
      saveRequirementsToStorage(id, updatedRequirements);
    }

    toast({ title: "Property Shortlisted" });
  };

  const handleRemoveFromShortlist = (property: Property) => {
    const updatedRequirements = requirements.map(r =>
      r.id === activeRequirementId
        ? {
          ...r,
          shortlistedProperties: r.shortlistedProperties.filter(p => p.id !== property.id),
          matchedProperties: [...r.matchedProperties, property],
        }
        : r
    );
    setRequirements(updatedRequirements);

    // Save to localStorage
    if (id) {
      saveRequirementsToStorage(id, updatedRequirements);
    }

    toast({ title: "Removed from Shortlist" });
  };

  const scheduleSiteVisit = () => {
    if (!siteVisitDate || !siteVisitTime) {
      toast({
        title: "Missing Information",
        description: "Please select both date and time for the site visit.",
        variant: "destructive",
      });
      return;
    }
    const newSiteVisit = { property: siteVisitProperty, date: siteVisitDate, time: siteVisitTime, notes: siteVisitNotes };
    const updatedRequirements = requirements.map(r =>
      r.id === activeRequirementId
        ? { ...r, siteVisits: [...r.siteVisits, newSiteVisit] }
        : r
    );
    setRequirements(updatedRequirements);

    // Save to localStorage
    if (id) {
      saveRequirementsToStorage(id, updatedRequirements);
    }

    toast({ title: "Site Visit Scheduled" });
    setSiteVisitDialog(false);
    setSiteVisitProperty(null);
    setSiteVisitDate("");
    setSiteVisitTime("");
    setSiteVisitNotes("");
  };

  const handleScheduleMeeting = () => {
    if (!meetingDate || !meetingTime) {
      toast({
        title: "Missing Information",
        description: "Please select both date and time for the meeting.",
        variant: "destructive",
      });
      return;
    }
    setMeetings(prev => [
      ...prev,
      {
        clientId: id,
        clientName: clientData.lastname || clientData.name || clientData.leadname ||
          (clientData.email ? clientData.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) :
            (clientData.phone ? `Client ${clientData.phone.slice(-4)}` : "N/A")),
        date: meetingDate,
        time: meetingTime,
        notes: meetingNotes,
      }
    ]);
    toast({
      title: "Meeting Scheduled",
      description: `Meeting for ${clientData.lastname || clientData.name || clientData.leadname ||
        (clientData.email ? clientData.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) :
          (clientData.phone ? `Client ${clientData.phone.slice(-4)}` : "N/A"))} scheduled for ${meetingDate} at ${meetingTime}.`,
    });
    setMeetingDialog(false);
    setMeetingDate("");
    setMeetingTime("");
    setMeetingNotes("");
  };

  // Function to refresh matched properties data
  const refreshMatchedProperties = async () => {
    try {
      // First, refresh bot suggested properties if they exist
      if (clientData && clientData["Bot Suggested Properties"] && clientData["Bot Suggested Properties"].trim() !== "") {
        console.log("Refreshing bot suggested properties...");
        const botProperties = parseBotProperties(clientData["Bot Suggested Properties"]);
        console.log("Parsed bot properties:", botProperties);

        // Fetch MongoDB IDs for all properties
        const propertiesWithIds = await fetchPropertyIds(botProperties);
        console.log("Properties with MongoDB IDs:", propertiesWithIds);

        // Update the first requirement with bot properties
        const updatedRequirements = requirements.map(req =>
          req.id === 1
            ? {
              ...req,
              matchedProperties: propertiesWithIds,
              preferences: {
                ...req.preferences,
                budget: clientData.budget || "Not specified",
                location: clientData.location || "Not specified",
                possession: clientData.possession_date || "Not specified",
                minBudget: clientData.minBudget || "Not specified",
                maxBudget: clientData.maxBudget || "Not specified",
                floorMin: clientData.minFloor || "Not specified",
                floorMax: clientData.maxFloor || "Not specified",
                sizeMin: clientData.minSize || "Not specified",
                sizeMax: clientData.maxSize || "Not specified",
                configuration: clientData.configuration || "Not specified",
                propertyType: clientData.propertyType || clientData.property_type || "Not specified",
                gatedType: clientData.communityType || "Not specified",
                facing: clientData.facing || "Not specified",
                buildingType: clientData.buildingType || "Not specified"
              }
            }
            : req
        );
        setRequirements(updatedRequirements);

        // Save to localStorage
        if (id) {
          saveRequirementsToStorage(id, updatedRequirements);
        }

        toast({
          title: "Bot Properties Refreshed",
          description: "Bot suggested properties have been updated successfully.",
        });
        return;
      }

      // Get the current requirement's preferences
      const currentRequirement = requirements.find(req => req.id === activeRequirementId);
      if (!currentRequirement) {
        toast({
          title: "Error",
          description: "No active requirement found.",
          variant: "destructive",
        });
        return;
      }

      // Create requirement data from current preferences
      const requirementData: Partial<Requirement> = {
        name: currentRequirement.name,
        preferences: {
          minBudget: currentRequirement.preferences.minBudget,
          maxBudget: currentRequirement.preferences.maxBudget,
          possession: currentRequirement.preferences.possession,
          configuration: currentRequirement.preferences.configuration,
          location: currentRequirement.preferences.location,
          propertyType: currentRequirement.preferences.propertyType,
          gatedType: currentRequirement.preferences.gatedType,
          communityType: currentRequirement.preferences.communityType,
          facing: currentRequirement.preferences.facing,
          buildingType: currentRequirement.preferences.buildingType,
          floorMin: currentRequirement.preferences.floorMin,
          floorMax: currentRequirement.preferences.floorMax,
          sizeMin: currentRequirement.preferences.sizeMin,
          sizeMax: currentRequirement.preferences.sizeMax,
          budget: currentRequirement.preferences.budget,
          includeGSTRegistration: currentRequirement.preferences.includeGSTRegistration
        }
      };

      // Call the create-requirement API to get fresh matches
      await createRequirementAndGetMatches(requirementData);

      toast({
        title: "Properties Refreshed",
        description: "Matched properties have been updated successfully.",
      });
    } catch (error) {
      console.error("Failed to refresh properties:", error);
      toast({
        title: "Error",
        description: "Could not refresh properties.",
        variant: "destructive",
      });
    }
  };

  // Function to refresh MongoDB IDs for all requirements
  const refreshMongoDBIdsForAllRequirements = async () => {
    try {
      console.log("Refreshing MongoDB IDs for all requirements...");
      const allRequirementsWithIds = await fetchMongoDBIdsForAllRequirements(requirements);
      setRequirements(allRequirementsWithIds);

      // Save updated requirements to localStorage
      if (id) {
        saveRequirementsToStorage(id, allRequirementsWithIds);
      }

      toast({
        title: "MongoDB IDs Refreshed",
        description: "All property MongoDB IDs have been updated.",
      });
    } catch (error) {
      console.error('Error refreshing MongoDB IDs:', error);
      toast({
        title: "Error",
        description: "Failed to refresh MongoDB IDs. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to fetch external property data from relai.world
  const openExternalPropertyPage = async (property: Property) => {
    const baseUrl = 'https://relai.world';
    const propertyName = property.title;

    console.log('Opening external property page for:', property);

    // For bot-suggested properties, prioritize RERA ID since they don't have MongoDB IDs yet
    // For database properties, prioritize MongoDB ID
    let primaryId = null;
    let idType = '';

    if (property.reraId && !property.mongodbId) {
      // This is likely a bot-suggested property - use RERA ID
      primaryId = property.reraId;
      idType = 'RERA ID';
    } else if (property.mongodbId) {
      // This is a database property - use MongoDB ID
      primaryId = property.mongodbId;
      idType = 'MongoDB ID';
    } else if (property.reraId) {
      // Fallback to RERA ID if no MongoDB ID
      primaryId = property.reraId;
      idType = 'RERA ID (fallback)';
    }

    if (primaryId) {
      const directUrl = `${baseUrl}/property/${primaryId}`;

      console.log(`Attempting to open property with ${idType}:`, {
        propertyName,
        id: primaryId,
        idType,
        directUrl
      });

      // Open the direct URL in a new tab
      const newWindow = window.open(directUrl, '_blank');

      if (newWindow) {
        toast({
          title: "External Page Opened",
          description: `Opening ${propertyName} page on relai.world using ${idType}.`,
        });
        return;
      }
    }

    // Fallback to search-based approach if MongoDB ID and RERA ID approaches fail
    const cleanName = propertyName
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .toLowerCase();

    // Try different URL patterns - ordered by likelihood of success
    const possibleUrls = [
      `${baseUrl}/property/${cleanName}`,
      `${baseUrl}/properties/${cleanName}`,
      `${baseUrl}/all-properties/${cleanName}`,
      `${baseUrl}/property-details/${cleanName}`,
      `${baseUrl}/all-properties?search=${encodeURIComponent(propertyName)}&view=details`,
      `${baseUrl}/all-properties?property=${encodeURIComponent(propertyName)}`,
      `${baseUrl}/all-properties?search=${encodeURIComponent(propertyName)}`
    ];

    // Try the first URL pattern (most likely to work)
    const primaryUrl = possibleUrls[0];

    // Open in a new tab
    const newWindow = window.open(primaryUrl, '_blank');

    // If the window failed to open, try the search URL as fallback
    if (!newWindow) {
      const fallbackUrl = `${baseUrl}/all-properties?search=${encodeURIComponent(propertyName)}`;
      window.open(fallbackUrl, '_blank');
    }

    toast({
      title: "External Page Opened",
      description: `Opening ${propertyName} page on relai.world in a new tab.`,
    });

    // Log all possible URLs for debugging
    console.log('Attempting to open property page:', {
      propertyName,
      cleanName,
      primaryUrl,
      allPossibleUrls: possibleUrls
    });
  };



  // Add this function after the parseBotProperties function
  const calculatePossessionTimeline = (possessionDate: string): string => {
    if (!possessionDate || possessionDate.trim() === '') {
      return 'Not specified';
    }

    // Handle special cases first
    const upperCaseDate = possessionDate.toUpperCase().trim();
    if (upperCaseDate === 'RTM' || upperCaseDate === 'READY TO MOVE IN') {
      return 'Ready To Move In';
    }

    try {
      const currentDate = new Date();
      let targetDate: Date;

      // Handle year-only format (e.g., "2025", "2026")
      if (possessionDate.match(/^\d{4}$/)) {
        const year = parseInt(possessionDate);
        const currentYear = currentDate.getFullYear();

        if (year <= currentYear) {
          return 'Ready To Move In';
        } else if (year === currentYear + 1) {
          return '6-12 months';
        } else if (year === currentYear + 2) {
          return '1-2 years';
        } else {
          return 'More than 2 years';
        }
      }

      // Handle different date formats
      if (possessionDate.includes('/')) {
        // Format: DD/MM/YY or DD/MM/YYYY (based on database format like "01/09/28")
        const parts = possessionDate.split('/');
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
      } else if (possessionDate.includes('-')) {
        // Format: YYYY-MM-DD or DD-MM-YYYY
        const parts = possessionDate.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            // YYYY-MM-DD format
            targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          } else {
            // DD-MM-YYYY format
            targetDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
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
        return 'Ready To Move In';
      } else if (diffMonths <= 6) {
        return '3-6 months';
      } else if (diffMonths <= 12) {
        return '6-12 months';
      } else if (diffMonths <= 24) {
        return '1-2 years';
      } else {
        return 'More than 2 years';
      }
    } catch (error) {
      console.error('Error calculating possession timeline:', error);
      return possessionDate; // Return original value if calculation fails
    }
  };

  // Helper function to format budget display
  const formatBudgetDisplay = (preferences: Requirement['preferences']): string => {
    // First check if budget string exists (highest priority)
    if (preferences?.budget && preferences.budget !== "Not specified" && preferences.budget !== "") {
      const budget = preferences.budget.toString();
      // If it already has ₹ symbol, return as is, otherwise add it
      if (budget.includes('₹')) {
        return budget;
      } else {
        return `₹${budget}`;
      }
    }

    // Fall back to minBudget/maxBudget only if budget string is not available
    if (preferences?.minBudget && preferences?.maxBudget) {
      const minBudget = parseInt(preferences.minBudget);
      const maxBudget = parseInt(preferences.maxBudget);

      // Check if parsed values are valid numbers
      if (Number.isFinite(minBudget) && Number.isFinite(maxBudget)) {
        // Convert to crores if the amount is large
        if (minBudget >= 10000000 || maxBudget >= 10000000) {
          const minCrores = (minBudget / 10000000).toFixed(1);
          const maxCrores = (maxBudget / 10000000).toFixed(1);
          return `₹${minCrores} - ${maxCrores} crore`;
        } else if (minBudget >= 100000 || maxBudget >= 100000) {
          const minLakhs = (minBudget / 100000).toFixed(1);
          const maxLakhs = (maxBudget / 100000).toFixed(1);
          return `₹${minLakhs} - ${maxLakhs} lakh`;
        } else {
          return `₹${minBudget.toLocaleString()} - ₹${maxBudget.toLocaleString()}`;
        }
      }
    }

    return "Not specified";
  };

  // Check if current user should see simplified view
  const userData = localStorage.getItem('userData');
  let showSimplifiedView = false;
  if (userData) {
    try {
      const user = JSON.parse(userData);
      const restrictedEmails = [
        "vaishnavig@relai.world",
        "angaleenaj@relai.world",
        "angelinak@relai.world",
        "subscriptions@relai.world",
        "sindhua@relai.world",
        "sindhu@relai.world",
      ];
      showSimplifiedView = restrictedEmails.includes(user.email);
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }

  // Simplified view for specific users
  if (showSimplifiedView) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 animate-fade-in lavender-theme">
        {/* Centered Container */}
        <div className="max-w-2xl w-full space-y-6">
          {/* Header with Back Button */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/clients")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                {clientData.lastname || clientData.name || clientData.leadName ||
                  (clientData.email ? clientData.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) :
                    (clientData.phone ? `Client ${clientData.phone.slice(-4)}` : "N/A"))}
              </h1>
              <p className="text-muted-foreground mt-1">
                {clientData.phone || clientData.mobile || "No contact number"}
              </p>
            </div>
          </div>

          {/* Main Card with Add Requirement Button */}
          <Card className="border-2">
            <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">Add Client Requirement</h2>
                <p className="text-muted-foreground">
                  Create a new property requirement for {clientData.name || "this client"}
                </p>
              </div>
              <Button
                size="lg"
                className="text-lg px-8 py-6"
                onClick={() => setAddReqDialog(true)}
                data-testid="button-add-requirement"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Requirement
              </Button>
            </CardContent>
          </Card>

          {/* Expert Scheduling Section */}
          <ExpertScheduling
            clientId={id!}
            clientName={clientData.lastname || clientData.name || clientData.leadName || "Client"}
          />

          {/* Requirements List - Notepad Style */}
          {requirements.length > 0 && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Client Requirements ({requirements.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {requirements.map((req, index) => {
                  // Helper function to check if a value is valid (not empty, not "Not specified", not undefined)
                  const isValidValue = (value: unknown) => {
                    if (!value) return false;
                    if (typeof value === 'string' && (value.trim() === '' || value === 'Not specified' || value === 'Not decided yet')) return false;
                    return true;
                  };

                  // Check if budget values are valid (check both budget string and min/max budget numbers)
                  const hasValidBudget = (req.preferences?.budget && req.preferences.budget !== '' && req.preferences.budget !== 'Not decided yet') ||
                    (req.preferences?.minBudget &&
                      req.preferences?.maxBudget &&
                      !isNaN(parseInt(req.preferences.minBudget)) &&
                      !isNaN(parseInt(req.preferences.maxBudget)) &&
                      parseInt(req.preferences.minBudget) > 0 &&
                      parseInt(req.preferences.maxBudget) > 0);

                  // Check if size values are valid (check both propertySize string and size min/max)
                  const hasValidSize = (req.preferences?.propertySize && req.preferences.propertySize !== '') ||
                    (req.preferences?.sizeMin &&
                      req.preferences?.sizeMax &&
                      req.preferences.sizeMin !== '' &&
                      req.preferences.sizeMax !== '');

                  // Count how many fields have actual data
                  const fieldCount = [
                    hasValidBudget,
                    isValidValue(req.preferences?.location),
                    isValidValue(req.preferences?.configuration),
                    isValidValue(req.preferences?.propertyType),
                    isValidValue(req.preferences?.possessionTimeline),
                    hasValidSize
                  ].filter(Boolean).length;

                  // Only show requirement if it has at least one valid field
                  if (fieldCount === 0) return null;

                  return (
                    <div
                      key={req.id}
                      className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-lg">{req.name || `Requirement ${index + 1}`}</h3>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRequirement(req)}
                              className="h-8 px-2"
                              data-testid={`button-edit-requirement-${req.id}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                              </svg>
                              Edit
                            </Button>
                            <div
                              className="flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full cursor-pointer hover:bg-primary/20 transition-colors"
                              data-testid={`matched-count-${req.id}`}
                              onClick={async () => {
                                console.log('🔵 Clicked on matched properties badge for requirement:', req.id);
                                setSelectedRequirementForProperties(req);
                                console.log('🔵 Set selected requirement, opening dialog...');
                                setMatchedPropertiesDialog(true);
                                console.log('🔵 Dialog state set to true, fetching properties...');
                                // Fetch all unique properties for this requirement
                                await fetchAllMatchedProperties(req);
                                console.log('🔵 Finished fetching properties');
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                <polyline points="9 22 9 12 15 12 15 22"></polyline>
                              </svg>
                              <span className="text-sm font-semibold text-primary">
                                {req.uniqueMatchedCount || req.matchedCount || 0} unique
                              </span>
                            </div>
                          </div>

                          {req.matchedPropertyNames && req.matchedPropertyNames.length > 0 ? (
                            <div className="text-sm text-muted-foreground max-w-md text-right mt-1">
                              {req.matchedPropertyNames.map((property: Property, propIndex: number) => (
                                <div key={propIndex} className="font-medium text-foreground">
                                  {property.ProjectName || property.projectName || 'Unknown Property'}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {hasValidBudget && (
                          <div>
                            <span className="font-medium text-muted-foreground">Budget:</span>
                            <p className="text-foreground">
                              {(() => {
                                if (req.preferences.budget) {
                                  return req.preferences.budget;
                                }
                                const minBudget = parseInt(req.preferences.minBudget);
                                const maxBudget = parseInt(req.preferences.maxBudget);
                                if (Number.isFinite(minBudget) && Number.isFinite(maxBudget)) {
                                  return `₹${(minBudget / 10000000).toFixed(2)}Cr - ₹${(maxBudget / 10000000).toFixed(2)}Cr`;
                                }
                                return "Not specified";
                              })()}
                            </p>
                          </div>
                        )}

                        {(isValidValue(req.preferences?.location) || (req.preferences?.locations && req.preferences.locations.length > 0)) && (
                          <div>
                            <span className="font-medium text-muted-foreground">Location:</span>
                            <p className="text-foreground">
                              {req.preferences.locations && req.preferences.locations.length > 0
                                ? req.preferences.locations.join(', ')
                                : req.preferences.location}
                            </p>
                          </div>
                        )}

                        {isValidValue(req.preferences?.configuration) && (
                          <div>
                            <span className="font-medium text-muted-foreground">Configuration:</span>
                            <p className="text-foreground">{req.preferences.configuration}</p>
                          </div>
                        )}

                        {isValidValue(req.preferences?.propertyType) && (
                          <div>
                            <span className="font-medium text-muted-foreground">Property Type:</span>
                            <p className="text-foreground">{req.preferences.propertyType}</p>
                          </div>
                        )}

                        {isValidValue(req.preferences?.possessionTimeline) && (
                          <div>
                            <span className="font-medium text-muted-foreground">Possession:</span>
                            <p className="text-foreground">{req.preferences.possessionTimeline}</p>
                          </div>
                        )}

                        {hasValidSize && (
                          <div>
                            <span className="font-medium text-muted-foreground">Property Size:</span>
                            <p className="text-foreground">
                              {req.preferences.propertySize || `${req.preferences.sizeMin} - ${req.preferences.sizeMax} SqFt`}
                            </p>
                          </div>
                        )}

                        {(req.uniqueMatchedCount || req.matchedCount || req.preferences?.matchedPropertyCount) && (
                          <div>
                            <span className="font-medium text-muted-foreground">Matched Properties:</span>
                            <p className="text-foreground">
                              {req.preferences?.matchedPropertyCount || req.uniqueMatchedCount || req.matchedCount || 0}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add/Edit Requirement Dialog */}
        {addReqDialog && (
          <Dialog open={addReqDialog} onOpenChange={(open) => {
            setAddReqDialog(open);
            if (!open) {
              setEditingRequirementId(null);
            }
          }}>
            <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
              <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  {editingRequirementId ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                      </svg>
                      Edit Requirement
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Add New Requirement
                    </>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 max-h-[calc(90vh-180px)] overflow-y-auto px-6 py-6">
                {/* Budget Section */}
                <div className="space-y-4 p-5 rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    Budget
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Budget Amount</Label>
                      <Input
                        value={newReqPreferences.budget}
                        onChange={e => setNewReqPreferences({ ...newReqPreferences, budget: e.target.value })}
                        placeholder="e.g., 5"
                        type="number"
                        data-testid="input-budget"
                      />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <Select
                        value={newReqPreferences.budgetUnit}
                        onValueChange={(value: "Crores" | "Lakhs") => setNewReqPreferences({ ...newReqPreferences, budgetUnit: value })}
                      >
                        <SelectTrigger data-testid="select-budget-unit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Crores">Crores</SelectItem>
                          <SelectItem value="Lakhs">Lakhs</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Financing Option Toggle */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                        <line x1="2" y1="10" x2="22" y2="10"></line>
                      </svg>
                      Financing Option
                    </Label>
                    <div className="flex items-center gap-4 p-4 border-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                      <span className={`text-sm font-semibold ${newReqPreferences.financingOption === "OTP" ? "text-primary" : "text-muted-foreground"}`}>
                        OTP
                      </span>
                      <Switch
                        checked={newReqPreferences.financingOption === "Loan option"}
                        onCheckedChange={(checked) => setNewReqPreferences({
                          ...newReqPreferences,
                          financingOption: checked ? "Loan option" : "OTP"
                        })}
                        data-testid="switch-financing-option"
                      />
                      <span className={`text-sm font-semibold ${newReqPreferences.financingOption === "Loan option" ? "text-primary" : "text-muted-foreground"}`}>
                        Loan option
                      </span>
                    </div>
                  </div>

                  {/* GST and Registration Checkbox */}
                  <div className="flex items-center space-x-3 p-3 rounded-lg border bg-white hover:bg-muted/20 transition-colors">
                    <Checkbox
                      id="gst-registration"
                      checked={newReqPreferences.includeGSTRegistration}
                      onCheckedChange={(checked) => setNewReqPreferences({
                        ...newReqPreferences,
                        includeGSTRegistration: checked === true
                      })}
                      data-testid="checkbox-gst-registration"
                    />
                    <label
                      htmlFor="gst-registration"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      including GST and Registration
                    </label>
                  </div>
                </div>

                {/* Location Section */}
                <div className="space-y-4 p-5 rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-transparent">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    Location
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Preferred Locations (Select multiple)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={fetchAreaNames}
                        disabled={loadingAreaNames}
                        className="h-7 px-2 text-xs"
                      >
                        <RefreshCw className={`h-3 w-3 ${loadingAreaNames ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>

                    {/* Selected locations display */}
                    {newReqPreferences.locations.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-2 border rounded bg-muted/30">
                        {newReqPreferences.locations.map((loc, idx) => (
                          <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                            {loc}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={() => {
                                setNewReqPreferences({
                                  ...newReqPreferences,
                                  locations: newReqPreferences.locations.filter((_, i) => i !== idx)
                                });
                              }}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Location dropdown with checkboxes */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-10"
                          disabled={loadingAreaNames}
                          data-testid="button-locations-popover"
                        >
                          {loadingAreaNames
                            ? "Loading areas..."
                            : newReqPreferences.locations.length > 0
                              ? `${newReqPreferences.locations.length} location(s) selected`
                              : "Click to add locations"}
                          <RefreshCw className={`ml-2 h-4 w-4 shrink-0 opacity-50 ${loadingAreaNames ? 'animate-spin' : ''}`} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search locations..." />
                          <CommandList className="max-h-64">
                            <CommandEmpty>No location found.</CommandEmpty>
                            <CommandGroup>
                              {(() => {
                                console.log('🔍 Location Dropdown Debug:');
                                console.log('Total area names:', areaNames.length);
                                console.log('Selected locations:', newReqPreferences.locations);
                                console.log('First 10 areas:', areaNames.slice(0, 10));

                                const sortedAreaNames = [...areaNames].sort();
                                const allSelected = sortedAreaNames.every(area => newReqPreferences.locations.includes(area));

                                return (
                                  <>
                                    {/* "All" option */}
                                    <CommandItem
                                      key="__all__"
                                      value="All Locations"
                                      onSelect={() => {
                                        console.log('🎯 All Locations clicked, currently all selected:', allSelected);
                                        if (allSelected) {
                                          // Deselect all
                                          console.log('➖ Deselecting all locations');
                                          setNewReqPreferences({
                                            ...newReqPreferences,
                                            locations: [],
                                            location: ''
                                          });
                                        } else {
                                          // Select all
                                          console.log('➕ Selecting all locations:', sortedAreaNames.length);
                                          setNewReqPreferences({
                                            ...newReqPreferences,
                                            locations: sortedAreaNames,
                                            location: sortedAreaNames.join(', ')
                                          });
                                        }
                                      }}
                                      className="cursor-pointer font-semibold border-b"
                                      data-testid="location-item-all"
                                    >
                                      <div className="flex items-center justify-between w-full gap-2">
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            checked={allSelected}
                                            className="pointer-events-none"
                                            data-testid="checkbox-all"
                                          />
                                          <span className="font-semibold">All Locations</span>
                                        </div>
                                        {allSelected && (
                                          <CheckIcon className="h-4 w-4 text-primary ml-auto shrink-0" data-testid="check-all" />
                                        )}
                                      </div>
                                    </CommandItem>

                                    {/* Individual locations */}
                                    {sortedAreaNames.map((areaName) => {
                                      const isSelected = newReqPreferences.locations.includes(areaName);

                                      if (isSelected) {
                                        console.log(`✅ ${areaName} is SELECTED`);
                                      }

                                      const handleLocationToggle = () => {
                                        console.log(`🖱️ Toggling location: ${areaName}, currently selected: ${isSelected}`);
                                        // Toggle selection: if already selected, remove it; otherwise add it
                                        if (isSelected) {
                                          console.log(`➖ Removing location: ${areaName}`);
                                          setNewReqPreferences({
                                            ...newReqPreferences,
                                            locations: newReqPreferences.locations.filter(loc => loc !== areaName),
                                            location: newReqPreferences.locations.filter(loc => loc !== areaName).join(', ')
                                          });
                                          return;
                                        }

                                        console.log(`➕ Adding location: ${areaName}`);
                                        // Get the location code for the selected location
                                        const locationCode = AREA_TO_LOCATION_CODE[areaName];

                                        // Find all areas with the same location code
                                        const relatedAreas = locationCode && LOCATION_AREA_MAPPING[locationCode] ? LOCATION_AREA_MAPPING[locationCode] : [];

                                        // If location code not found, just add the selected location
                                        if (!locationCode) {
                                          setNewReqPreferences({
                                            ...newReqPreferences,
                                            locations: [...newReqPreferences.locations, areaName],
                                            location: newReqPreferences.locations.length === 0 ? areaName : [...newReqPreferences.locations, areaName].join(', ')
                                          });
                                          return;
                                        }

                                        // Filter out areas that are already selected and areas not in the available areaNames list
                                        const areasToAdd = relatedAreas.filter(area =>
                                          !newReqPreferences.locations.includes(area) &&
                                          areaNames.includes(area)
                                        );

                                        // Add the selected location and all related areas
                                        const newLocations = [...newReqPreferences.locations, areaName, ...areasToAdd.filter(a => a !== areaName)];
                                        console.log(`📍 New locations after toggle:`, newLocations);

                                        setNewReqPreferences({
                                          ...newReqPreferences,
                                          locations: newLocations,
                                          location: newReqPreferences.locations.length === 0 ? areaName : newLocations.join(', ')
                                        });

                                        // Show toast notification about auto-selected areas
                                        if (areasToAdd.length > 1) {
                                          toast({
                                            title: "Areas Auto-Selected",
                                            description: `${areasToAdd.length - 1} related area(s) were automatically selected for ${areaName}.`,
                                          });
                                        }
                                      };

                                      return (
                                        <CommandItem
                                          key={areaName}
                                          value={areaName}
                                          onSelect={handleLocationToggle}
                                          className="cursor-pointer"
                                          data-testid={`location-item-${areaName}`}
                                        >
                                          <div className="flex items-center justify-between w-full gap-2">
                                            <div className="flex items-center gap-2">
                                              <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={handleLocationToggle}
                                                className="pointer-events-none"
                                                data-testid={`checkbox-${areaName}`}
                                              />
                                              <span className={isSelected ? "font-medium" : ""}>{areaName}</span>
                                            </div>
                                            {isSelected && (
                                              <CheckIcon className="h-4 w-4 text-primary ml-auto shrink-0" data-testid={`check-${areaName}`} />
                                            )}
                                          </div>
                                        </CommandItem>
                                      );
                                    })}
                                  </>
                                );
                              })()}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Possession Section */}
                <div className="space-y-4 p-5 rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-transparent">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    Possession
                  </h3>
                  <div className="space-y-2">
                    <Label>Possession Timeline (Select multiple)</Label>

                    {/* Selected possessions display */}
                    {newReqPreferences.possessions.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-2 border rounded bg-muted/30">
                        {newReqPreferences.possessions.map((poss, idx) => (
                          <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                            {poss}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={() => {
                                setNewReqPreferences({
                                  ...newReqPreferences,
                                  possessions: newReqPreferences.possessions.filter((_, i) => i !== idx)
                                });
                              }}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Possession dropdown with multiple selection */}
                    <Select
                      value=""
                      onValueChange={value => {
                        if (value && !newReqPreferences.possessions.includes(value)) {
                          setNewReqPreferences({
                            ...newReqPreferences,
                            possessions: [...newReqPreferences.possessions, value],
                            possessionTimeline: newReqPreferences.possessions.length === 0 ? value : newReqPreferences.possessions.join(', ')
                          });
                        }
                      }}
                    >
                      <SelectTrigger data-testid="select-possession">
                        <SelectValue placeholder={
                          newReqPreferences.possessions.length > 0
                            ? `${newReqPreferences.possessions.length} possession timeline(s) selected`
                            : "Click to add possession timelines"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {["Not decided yet", "Ready to Move In", "Under 6 Months", "Under 1 Year", "Under 2 Years", "More than 2 Years"]
                          .filter(poss => !newReqPreferences.possessions.includes(poss))
                          .map((poss, index) => (
                            <SelectItem key={index} value={poss}>
                              {poss}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Configuration Section */}
                <div className="space-y-4 p-5 rounded-lg border-2 border-green-200 bg-gradient-to-br from-green-50/50 to-transparent">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    Configuration
                  </h3>
                  <div className="space-y-2">
                    <Label>Property Configuration (Select multiple)</Label>

                    {/* Selected configurations display */}
                    {newReqPreferences.configurations.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-2 border rounded bg-muted/30">
                        {newReqPreferences.configurations.map((config, idx) => (
                          <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                            {config}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={() => {
                                setNewReqPreferences({
                                  ...newReqPreferences,
                                  configurations: newReqPreferences.configurations.filter((_, i) => i !== idx)
                                });
                              }}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Configuration dropdown with multiple selection */}
                    <Select
                      value=""
                      onValueChange={value => {
                        if (value && !newReqPreferences.configurations.includes(value)) {
                          setNewReqPreferences({
                            ...newReqPreferences,
                            configurations: [...newReqPreferences.configurations, value],
                            configuration: newReqPreferences.configurations.length === 0 ? value : newReqPreferences.configurations.join(', ')
                          });
                        }
                      }}
                    >
                      <SelectTrigger data-testid="select-configuration">
                        <SelectValue placeholder={
                          newReqPreferences.configurations.length > 0
                            ? `${newReqPreferences.configurations.length} configuration(s) selected`
                            : "Click to add configurations"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {["1 BHK", "1.5 BHK", "2 BHK", "2.5 BHK", "3 BHK", "3.5 BHK", "4 BHK", "4.5 BHK", "5 BHK", "6 BHK"]
                          .filter(config => !newReqPreferences.configurations.includes(config))
                          .map((config, index) => (
                            <SelectItem key={index} value={config}>
                              {config}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Property Type Section */}
                <div className="space-y-4 p-5 rounded-lg border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-transparent">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                    Property Type
                  </h3>
                  <div>
                    <Label>Type of Property</Label>
                    <select
                      value={newReqPreferences.propertyType || ""}
                      onChange={e => setNewReqPreferences({ ...newReqPreferences, propertyType: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent"
                    >
                      <option value="">Select property type</option>
                      <option value="Apartment">Apartment</option>
                      <option value="Villa">Villa</option>
                      <option value="Villa-Apartment">Villa-Apartment</option>
                    </select>
                  </div>
                </div>

                {/* Property Size Section */}
                <div className="space-y-4 p-5 rounded-lg border-2 border-cyan-200 bg-gradient-to-br from-cyan-50/50 to-transparent">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-600">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                      <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    Property Size
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Min Size (SqFt)</Label>
                      <Input
                        value={newReqPreferences.sizeMin || ""}
                        onChange={e => setNewReqPreferences({ ...newReqPreferences, sizeMin: e.target.value })}
                        placeholder="e.g., 1000"
                        type="number"
                      />
                    </div>
                    <div>
                      <Label>Max Size (SqFt)</Label>
                      <Input
                        value={newReqPreferences.sizeMax || ""}
                        onChange={e => setNewReqPreferences({ ...newReqPreferences, sizeMax: e.target.value })}
                        placeholder="e.g., 2000"
                        type="number"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-muted/20">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddReqDialog(false);
                    setEditingRequirementId(null);
                  }}
                  disabled={isCreatingRequirement}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingRequirementId ? handleUpdateRequirement : handleAddRequirement}
                  disabled={isCreatingRequirement}
                  data-testid="button-submit-requirement"
                  className="px-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                >
                  {isCreatingRequirement ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {editingRequirementId ? "Updating..." : "Creating..."}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {editingRequirementId ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Update Requirement
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                          Create Requirement
                        </>
                      )}
                    </span>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // Full detailed view for other users
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h2 className="text-2xl font-bold">Client Not Found</h2>
        <Button onClick={() => navigate("/clients")}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/clients")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">
            {clientData.lastname || clientData.name || clientData.leadName ||
              (clientData.email ? clientData.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) :
                (clientData.phone ? `Client ${clientData.phone.slice(-4)}` : "N/A"))}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {isEditingLocation ? (
              <div className="flex items-center gap-2">
                <Input
                  value={locationValue}
                  onChange={(e) => setLocationValue(e.target.value)}
                  className="h-6 w-32 text-sm"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                  onClick={handleLocationSave}
                >
                  <CheckIcon className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  onClick={handleLocationCancel}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <>
                <span className="text-muted-foreground">{locationValue}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleLocationEdit}
                >
                  <Edit3 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </>
            )}
            <Badge variant="default">Active</Badge>
            <Badge variant="destructive">High Priority</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Client Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{clientData.email || "N/A"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{clientData.phone || clientData.mobile || "N/A"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Last contact: {clientData.modifiedTime ? new Date(clientData.modifiedTime).toLocaleDateString() : "Not available"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Expert Scheduling Component */}
          <ExpertScheduling
            clientId={id!}
            clientName={clientData.lastname || clientData.name || clientData.leadName || "Client"}
          />

          {/* Requirement Preferences - Only show for Requirement 2 and above */}
          {activeRequirement.id !== 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preferences</CardTitle>
                <CardDescription>{activeRequirement.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Budget</span>
                    <p className="font-medium">{formatBudgetDisplay(activeRequirement.preferences)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Property Type</span>
                    <p className="font-medium">{activeRequirement.preferences.propertyType || "Not specified"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Possession Dates</span>
                    <p className="font-medium">
                      {activeRequirement.preferences.possession
                        ? (activeRequirement.preferences.possession === "Ready to Move" ||
                          activeRequirement.preferences.possession.toLowerCase().includes("ready")
                          ? "Ready to Move"
                          : activeRequirement.preferences.possession)
                        : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location</span>
                    <p className="font-medium">
                      {activeRequirement.preferences.locations && activeRequirement.preferences.locations.length > 0
                        ? activeRequirement.preferences.locations.join(", ")
                        : activeRequirement.preferences.location || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Configuration</span>
                    <p className="font-medium">
                      {activeRequirement.preferences.configurations && activeRequirement.preferences.configurations.length > 0
                        ? activeRequirement.preferences.configurations.join(", ")
                        : activeRequirement.preferences.configuration || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Property Size</span>
                    <p className="font-medium">
                      {activeRequirement.preferences.sizeMin && activeRequirement.preferences.sizeMax &&
                        activeRequirement.preferences.sizeMin !== "Not specified" &&
                        activeRequirement.preferences.sizeMax !== "Not specified"
                        ? `${activeRequirement.preferences.sizeMin} - ${activeRequirement.preferences.sizeMax} SqFt`
                        : "Not specified"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">OTP/Loan</span>
                    <p className="font-medium">{activeRequirement.preferences.financingOption || "Not specified"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">including GST and Registration</span>
                    <p className="font-medium">{activeRequirement.preferences.includeGSTRegistration ? "Yes" : "No"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 flex-wrap">
            {requirements.map(req => (
              <div key={req.id} className="relative inline-flex">
                <Button
                  variant={activeRequirementId === req.id ? "default" : "outline"}
                  onClick={() => setActiveRequirementId(req.id)}
                  className={`
                    ${req.id !== 1 ? "pr-9" : ""} 
                    ${activeRequirementId === req.id
                      ? "bg-primary text-white hover:bg-primary/90 border-2 border-primary"
                      : "bg-white text-black hover:bg-gray-50 border-2 border-gray-300"
                    }
                    font-semibold shadow-sm
                  `}
                  data-testid={`requirement-tab-${req.id}`}
                >
                  {req.name}
                </Button>
                {req.id !== 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRequirement(req);
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-sm hover:bg-destructive/90 bg-background/80 border border-border hover:border-destructive transition-all z-20 shadow-sm"
                    title="Delete requirement"
                    data-testid={`delete-requirement-${req.id}`}
                  >
                    <X className="h-3 w-3 text-foreground hover:text-white transition-colors" />
                  </button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setAddReqDialog(true)}>
              + Add Requirement
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              <Tabs defaultValue="properties" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="properties">Matched Properties</TabsTrigger>
                  <TabsTrigger value="shortlisted">Shortlisted</TabsTrigger>
                  <TabsTrigger value="sitevisits">Conversations</TabsTrigger>
                  <TabsTrigger value="scheduling">Expert Scheduling</TabsTrigger>
                </TabsList>

                <TabsContent value="properties">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Property Matches</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{activeRequirement.matchedProperties.length || 0} available matches</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshMatchedProperties}
                        className="h-8 px-3"
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Refresh
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshPropertiesCache}
                        className="h-8 px-3"
                      >
                        <Database className="h-4 w-4 mr-1" />
                        Refresh Cache
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshMongoDBIdsForAllRequirements}
                        className="h-8 px-3"
                      >
                        <Key className="h-4 w-4 mr-1" />
                        Refresh IDs
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={debugBotProperties}
                        className="h-8 px-3"
                      >
                        <Bug className="h-4 w-4 mr-1" />
                        Debug Bot
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={setBotProperties}
                        className="h-8 px-3"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Set Bot Props
                      </Button>
                    </div>
                  </div>

                  {(activeRequirement?.matchedProperties?.length === 0 || !activeRequirement?.matchedProperties) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No matched properties available</p>
                      <p className="text-sm">Properties will appear here when they match your requirements</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {activeRequirement.matchedProperties.map((property, index) => (
                        <Card
                          key={property.id}
                          className="cursor-pointer hover:shadow-hover transition-all duration-200 animate-slide-up"
                          style={{ animationDelay: `${index * 0.1}s` }}

                        >
                          <div className="relative">
                            <div className="h-48 bg-muted rounded-t-lg flex items-center justify-center">
                              <Home className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <Badge
                              variant={getMatchColor(property.match) as "default" | "secondary" | "destructive" | "outline"}
                              className="absolute top-2 right-2"
                            >
                              {property.match}% match
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`absolute top-2 left-2 h-8 w-8 p-0 bg-white/90 hover:bg-white relative ${loadPropertyNote(id!, property.id) ? 'border-blue-500' : ''
                                }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openPropertyNotesDialog(property);
                              }}
                            >
                              <FileText className="h-4 w-4" />
                              {loadPropertyNote(id!, property.id) && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                              )}
                            </Button>
                          </div>

                          <CardContent className="p-4 space-y-3">
                            <div>
                              <h4 className="font-semibold text-foreground">{property.title}</h4>
                              <p className="text-sm text-muted-foreground">{property.address}</p>
                              <p className="text-lg font-bold text-success mt-1">{property.price}</p>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Home className="h-4 w-4" />
                                {property.bedrooms} bed
                              </div>
                              <div className="flex items-center gap-1">
                                <Bath className="h-4 w-4" />
                                {property.bathrooms} bath
                              </div>
                              <div className="flex items-center gap-1">
                                <Square className="h-4 w-4" />
                                {property.sqft}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Configuration:</span>
                                <span>{property.configuration || `${property.bedrooms}BHK`}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Size:</span>
                                <span>{property.sqft}</span>
                              </div>
                            </div>

                            {/* Additional property details from bot properties */}
                            {property.developer && (
                              <div className="text-sm text-muted-foreground">
                                <span className="font-medium">Developer:</span> {property.developer}
                              </div>
                            )}

                            {property.possession && (
                              <div className="text-sm text-muted-foreground">
                                <span className="font-medium">Possession:</span> {property.possession}
                              </div>
                            )}

                            {property.reraId && (
                              <div className="text-sm text-muted-foreground">
                                <span className="font-medium">RERA:</span> {property.reraId}
                              </div>
                            )}

                            {/* Additional property details from our API */}
                            {property.builderName && (
                              <div className="text-sm text-muted-foreground">
                                <span className="font-medium">Builder:</span> {property.builderName}
                              </div>
                            )}

                            {property.gridScore && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">GRID Score:</span>
                                <Badge variant="outline" className="text-blue-600 font-semibold">
                                  {property.gridScore}
                                </Badge>
                              </div>
                            )}

                            {/* Property Status Dropdown */}
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Status</Label>
                              <Select
                                value={loadPropertyStatus(id!, property.id)}
                                onValueChange={(value) => handlePropertyStatusChange(property, value)}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent className="max-h-48 overflow-y-auto">
                                  <SelectItem value="No Status">No Status</SelectItem>
                                  <SelectItem value="Site visit Initiated">Site visit Initiated</SelectItem>
                                  <SelectItem value="Done Site Visit">Done Site Visit</SelectItem>
                                  <SelectItem value="Finalized">Finalized</SelectItem>
                                  <SelectItem value="Token Amount">Token Amount</SelectItem>
                                  <SelectItem value="AOS loan procedure">AOS loan procedure</SelectItem>
                                  <SelectItem value="AOS initiated">AOS initiated</SelectItem>
                                  <SelectItem value="AOS Done">AOS Done</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    tabIndex={-1}
                                    onClick={() => openExternalPropertyPage(property).catch(console.error)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>{property.title}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                                      <Home className="h-16 w-16 text-muted-foreground" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-sm font-medium">Address</p>
                                        <p className="text-sm text-muted-foreground">{property.address}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">Price</p>
                                        <p className="text-sm font-semibold text-success">{property.price}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">Configuration</p>
                                        <p className="text-sm text-muted-foreground">{property.bedrooms}BHK</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">Size</p>
                                        <p className="text-sm text-muted-foreground">{property.sqft}</p>
                                      </div>
                                      {property.builderName && (
                                        <div>
                                          <p className="text-sm font-medium">Builder</p>
                                          <p className="text-sm text-muted-foreground">{property.builderName}</p>
                                        </div>
                                      )}
                                      {property.reraId && (
                                        <div>
                                          <p className="text-sm font-medium">RERA Number</p>
                                          <p className="text-sm text-muted-foreground">{property.reraId}</p>
                                        </div>
                                      )}
                                      {property.gridScore && (
                                        <div>
                                          <p className="text-sm font-medium">GRID Score</p>
                                          <p className="text-sm font-semibold text-blue-600">{property.gridScore}</p>
                                        </div>
                                      )}

                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="shortlisted">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Shortlisted Properties</h3>
                    <Badge variant="outline">{activeRequirement.shortlistedProperties.length} shortlisted</Badge>
                  </div>

                  {activeRequirement.shortlistedProperties.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No properties shortlisted yet for this requirement</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {activeRequirement.shortlistedProperties.map((property, index) => (
                        <Card
                          key={property.id}
                          className="cursor-pointer hover:shadow-hover transition-all duration-200 animate-slide-up"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="relative">
                            <div className="h-48 bg-muted rounded-t-lg flex items-center justify-center">
                              <Home className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <Badge
                              variant={getMatchColor(property.match) as "default" | "secondary" | "destructive" | "outline"}
                              className="absolute top-2 right-2"
                            >
                              {property.match}% match
                            </Badge>
                            <Badge
                              variant="default"
                              className="absolute top-2 left-2"
                            >
                              <Bookmark className="h-3 w-3 mr-1" />
                              Shortlisted
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`absolute top-2 left-12 h-8 w-8 p-0 bg-white/90 hover:bg-white relative ${loadPropertyNote(id!, property.id) ? 'border-blue-500' : ''
                                }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openPropertyNotesDialog(property);
                              }}
                            >
                              <FileText className="h-4 w-4" />
                              {loadPropertyNote(id!, property.id) && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                              )}
                            </Button>
                          </div>

                          <CardContent className="p-4 space-y-3">
                            <div>
                              <h4 className="font-semibold text-foreground">{property.title}</h4>
                              <p className="text-sm text-muted-foreground">{property.address}</p>
                              <p className="text-lg font-bold text-success mt-1">{property.price}</p>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Home className="h-4 w-4" />
                                {property.bedrooms} bed
                              </div>
                              <div className="flex items-center gap-1">
                                <Bath className="h-4 w-4" />
                                {property.bathrooms} bath
                              </div>
                              <div className="flex items-center gap-1">
                                <Square className="h-4 w-4" />
                                {property.sqft}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Configuration:</span>
                                <span>{property.bedrooms}BHK</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Size:</span>
                                <span>{property.sqft}</span>
                              </div>
                            </div>

                            {/* Property Status Dropdown */}
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Status</Label>
                              <Select
                                value={loadPropertyStatus(id!, property.id)}
                                onValueChange={(value) => handlePropertyStatusChange(property, value)}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent className="max-h-48 overflow-y-auto">
                                  <SelectItem value="No Status">No Status</SelectItem>
                                  <SelectItem value="Site visit Initiated">Site visit Initiated</SelectItem>
                                  <SelectItem value="Done Site Visit">Done Site Visit</SelectItem>
                                  <SelectItem value="Finalized">Finalized</SelectItem>
                                  <SelectItem value="Token Amount">Token Amount</SelectItem>
                                  <SelectItem value="AOS loan procedure">AOS loan procedure</SelectItem>
                                  <SelectItem value="AOS initiated">AOS initiated</SelectItem>
                                  <SelectItem value="AOS Done">AOS Done</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => openExternalPropertyPage(property).catch(console.error)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>{property.title}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                                      <Home className="h-16 w-16 text-muted-foreground" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-sm font-medium">Address</p>
                                        <p className="text-sm text-muted-foreground">{property.address}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">Price</p>
                                        <p className="text-sm font-semibold text-success">{property.price}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">Configuration</p>
                                        <p className="text-sm text-muted-foreground">{property.bedrooms}BHK</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">Size</p>
                                        <p className="text-sm text-muted-foreground">{property.sqft}</p>
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setSiteVisitProperty(property); setSiteVisitDialog(true); }}
                              >
                                <CalendarDays className="h-4 w-4 mr-1" />
                                Site Visit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveFromShortlist(property)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="sitevisits">
                  <div className="space-y-4">
                    {(() => {
                      // Use dynamic conversation data from clientData or empty array
                      const conversations = clientData?.conversations || [];
                      const types = [
                        { key: "call", label: "Call" },
                        { key: "WhatsApp Bot", label: "WhatsApp Bot" },
                        { key: "WebBot", label: "WebBot" },
                        { key: "call(Bot)", label: "Call(Bot)" },
                      ];
                      // Group conversations by type
                      const grouped = types.map(t => ({
                        ...t,
                        items: conversations.filter(c => c.type === t.key)
                      }));
                      return (
                        <>
                          {grouped.map(group => (
                            <div key={group.key} className="border rounded shadow-sm bg-white">
                              <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted"
                                onClick={() => setOpenConversationGroup(openConversationGroup === group.key ? null : group.key)}
                              >
                                <div className="font-semibold text-lg">{group.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {group.items.length > 0 ? group.items[0].date : "No conversations yet"}
                                </div>
                                <span className="ml-2">{openConversationGroup === group.key ? "▲" : "▼"}</span>
                              </div>
                              {openConversationGroup === group.key && (
                                <div className="p-4 border-t bg-muted/50">
                                  {group.items.length > 0 ? (
                                    group.items.map((item, idx) => (
                                      <div key={idx} className="mb-2">
                                        <div className="text-sm font-medium">{item.date}</div>
                                        <div className="text-sm text-muted-foreground">{item.summary}</div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm text-muted-foreground italic">No conversations in this category yet.</div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      );
                    })()}
                    {/* WebBot Chat History from localStorage */}
                    <WebBotChatHistory clientId={id} />
                  </div>
                </TabsContent>

                <TabsContent value="conversations">
                  <div className="space-y-4">
                    {(() => {
                      // Use dynamic conversation data from clientData or empty array
                      const conversations = clientData?.conversations || [];
                      const types = [
                        { key: "call", label: "Call" },
                        { key: "WhatsApp Bot", label: "WhatsApp Bot" },
                        { key: "WebBot", label: "WebBot" },
                        { key: "call(Bot)", label: "Call(Bot)" },
                      ];
                      // Group conversations by type
                      const grouped = types.map(t => ({
                        ...t,
                        items: conversations.filter(c => c.type === t.key)
                      }));
                      return (
                        <>
                          {grouped.map(group => (
                            <div key={group.key} className="border rounded shadow-sm bg-white">
                              <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted"
                                onClick={() => setOpenConversationGroup(openConversationGroup === group.key ? null : group.key)}
                              >
                                <div className="font-semibold text-lg">{group.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {group.items.length > 0 ? group.items[0].date : "No conversations yet"}
                                </div>
                                <span className="ml-2">{openConversationGroup === group.key ? "▲" : "▼"}</span>
                              </div>
                              {openConversationGroup === group.key && (
                                <div className="p-4 border-t bg-muted/50">
                                  {group.items.length > 0 ? (
                                    group.items.map((item, idx) => (
                                      <div key={idx} className="mb-2">
                                        <div className="text-sm font-medium">{item.date}</div>
                                        <div className="text-sm text-muted-foreground">{item.summary}</div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm text-muted-foreground italic">No conversations in this category yet.</div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      );
                    })()}
                    {/* WebBot Chat History from localStorage */}
                    <WebBotChatHistory clientId={id} />
                  </div>
                </TabsContent>

                <TabsContent value="scheduling">
                  <ExpertScheduling
                    clientId={clientData?.id || clientData?.mobile || ''}
                    clientName={clientData?.name || clientData?.leadname || 'Client'}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Site Visit Scheduling Dialog */}
      <Dialog open={siteVisitDialog} onOpenChange={setSiteVisitDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Site Visit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">{siteVisitProperty?.title}</h4>
              <p className="text-sm text-muted-foreground">{siteVisitProperty?.address}</p>
              <p className="text-sm font-semibold text-success">{siteVisitProperty?.price}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="visit-date">Date</Label>
                <Input
                  id="visit-date"
                  type="date"
                  value={siteVisitDate}
                  onChange={(e) => setSiteVisitDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visit-time">Time</Label>
                <select
                  id="visit-time"
                  value={siteVisitTime}
                  onChange={(e) => setSiteVisitTime(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent"
                >
                  <option value="">--:--</option>
                  <option value="12:00 AM">12:00 AM</option>
                  <option value="12:30 AM">12:30 AM</option>
                  <option value="1:00 AM">1:00 AM</option>
                  <option value="1:30 AM">1:30 AM</option>
                  <option value="2:00 AM">2:00 AM</option>
                  <option value="2:30 AM">2:30 AM</option>
                  <option value="3:00 AM">3:00 AM</option>
                  <option value="3:30 AM">3:30 AM</option>
                  <option value="4:00 AM">4:00 AM</option>
                  <option value="4:30 AM">4:30 AM</option>
                  <option value="5:00 AM">5:00 AM</option>
                  <option value="5:30 AM">5:30 AM</option>
                  <option value="6:00 AM">6:00 AM</option>
                  <option value="6:30 AM">6:30 AM</option>
                  <option value="7:00 AM">7:00 AM</option>
                  <option value="7:30 AM">7:30 AM</option>
                  <option value="8:00 AM">8:00 AM</option>
                  <option value="8:30 AM">8:30 AM</option>
                  <option value="9:00 AM">9:00 AM</option>
                  <option value="9:30 AM">9:30 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="10:30 AM">10:30 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="12:30 PM">12:30 PM</option>
                  <option value="1:00 PM">1:00 PM</option>
                  <option value="1:30 PM">1:30 PM</option>
                  <option value="2:00 PM">2:00 PM</option>
                  <option value="2:30 PM">2:30 PM</option>
                  <option value="3:00 PM">3:00 PM</option>
                  <option value="3:30 PM">3:30 PM</option>
                  <option value="4:00 PM">4:00 PM</option>
                  <option value="4:30 PM">4:30 PM</option>
                  <option value="5:00 PM">5:00 PM</option>
                  <option value="5:30 PM">5:30 PM</option>
                  <option value="6:00 PM">6:00 PM</option>
                  <option value="6:30 PM">6:30 PM</option>
                  <option value="7:00 PM">7:00 PM</option>
                  <option value="7:30 PM">7:30 PM</option>
                  <option value="8:00 PM">8:00 PM</option>
                  <option value="8:30 PM">8:30 PM</option>
                  <option value="9:00 PM">9:00 PM</option>
                  <option value="9:30 PM">9:30 PM</option>
                  <option value="10:00 PM">10:00 PM</option>
                  <option value="10:30 PM">10:30 PM</option>
                  <option value="11:00 PM">11:00 PM</option>
                  <option value="11:30 PM">11:30 PM</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visit-notes">Notes (Optional)</Label>
              <Textarea
                id="visit-notes"
                placeholder="Add any special requirements or notes for the site visit..."
                value={siteVisitNotes}
                onChange={(e) => setSiteVisitNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSiteVisitDialog(false)}>
                Cancel
              </Button>
              <Button onClick={scheduleSiteVisit}>
                <Clock className="h-4 w-4 mr-2" />
                Schedule Visit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Add/Edit Requirement Dialog */}
      {addReqDialog && (
        <Dialog open={addReqDialog} onOpenChange={(open) => {
          setAddReqDialog(open);
          if (!open) {
            setEditingRequirementId(null);
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                {editingRequirementId ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                    Edit Requirement
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add New Requirement
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 max-h-[calc(90vh-180px)] overflow-y-auto px-6 py-6">
              {/* Budget Section */}
              <div className="space-y-4 p-5 rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                  Budget
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Budget Amount</Label>
                    <Input
                      value={newReqPreferences.budget}
                      onChange={e => setNewReqPreferences({ ...newReqPreferences, budget: e.target.value })}
                      placeholder="e.g., 5"
                      type="number"
                      data-testid="input-budget"
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Select
                      value={newReqPreferences.budgetUnit}
                      onValueChange={(value: "Crores" | "Lakhs") => setNewReqPreferences({ ...newReqPreferences, budgetUnit: value })}
                    >
                      <SelectTrigger data-testid="select-budget-unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Crores">Crores</SelectItem>
                        <SelectItem value="Lakhs">Lakhs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Financing Option Toggle */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                      <line x1="2" y1="10" x2="22" y2="10"></line>
                    </svg>
                    Financing Option
                  </Label>
                  <div className="flex items-center gap-4 p-4 border-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                    <span className={`text-sm font-semibold ${newReqPreferences.financingOption === "OTP" ? "text-primary" : "text-muted-foreground"}`}>
                      OTP
                    </span>
                    <Switch
                      checked={newReqPreferences.financingOption === "Loan option"}
                      onCheckedChange={(checked) => setNewReqPreferences({
                        ...newReqPreferences,
                        financingOption: checked ? "Loan option" : "OTP"
                      })}
                      data-testid="switch-financing-option"
                    />
                    <span className={`text-sm font-semibold ${newReqPreferences.financingOption === "Loan option" ? "text-primary" : "text-muted-foreground"}`}>
                      Loan option
                    </span>
                  </div>
                </div>

                {/* GST and Registration Checkbox */}
                <div className="flex items-center space-x-3 p-3 rounded-lg border bg-white hover:bg-muted/20 transition-colors">
                  <Checkbox
                    id="gst-registration-dialog2"
                    checked={newReqPreferences.includeGSTRegistration}
                    onCheckedChange={(checked) => setNewReqPreferences({
                      ...newReqPreferences,
                      includeGSTRegistration: checked === true
                    })}
                    data-testid="checkbox-gst-registration"
                  />
                  <label
                    htmlFor="gst-registration-dialog2"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    including GST and Registration
                  </label>
                </div>
              </div>

              {/* Location Section */}
              <div className="space-y-4 p-5 rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-transparent">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Location
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Preferred Locations (Select multiple)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fetchAreaNames}
                      disabled={loadingAreaNames}
                      className="h-7 px-2 text-xs"
                    >
                      <RefreshCw className={`h-3 w-3 ${loadingAreaNames ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>

                  {/* Selected locations display */}
                  {newReqPreferences.locations.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 border rounded bg-muted/30">
                      {newReqPreferences.locations.map((loc, idx) => (
                        <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                          {loc}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => {
                              setNewReqPreferences({
                                ...newReqPreferences,
                                locations: newReqPreferences.locations.filter((_, i) => i !== idx)
                              });
                            }}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Location dropdown with checkboxes */}
                  <Select
                    value=""
                    onValueChange={value => {
                      const isSelected = newReqPreferences.locations.includes(value);
                      if (value) {
                        if (isSelected) {
                          setNewReqPreferences({
                            ...newReqPreferences,
                            locations: newReqPreferences.locations.filter(loc => loc !== value),
                            location: newReqPreferences.locations.filter(loc => loc !== value).join(', ')
                          });
                        } else {
                          setNewReqPreferences({
                            ...newReqPreferences,
                            locations: [...newReqPreferences.locations, value],
                            location: newReqPreferences.locations.length === 0 ? value : [...newReqPreferences.locations, value].join(', ')
                          });
                        }
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-locations">
                      <SelectValue placeholder={
                        loadingAreaNames
                          ? "Loading areas..."
                          : newReqPreferences.locations.length > 0
                            ? `${newReqPreferences.locations.length} location(s) selected`
                            : "Click to add locations"
                      } />
                    </SelectTrigger>
                    <SelectContent className="max-h-48 overflow-y-auto">
                      {loadingAreaNames ? (
                        <SelectItem value="loading" disabled>Loading areas...</SelectItem>
                      ) : areaNames.length > 0 ? (
                        [...areaNames].sort().map((areaName, index) => {
                          const isSelected = newReqPreferences.locations.includes(areaName);
                          return (
                            <SelectItem
                              key={index}
                              value={areaName}
                              data-testid={`location-option-${areaName}`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{areaName}</span>
                                {isSelected && (
                                  <CheckIcon className="h-4 w-4 ml-2 text-primary" data-testid={`location-check-${areaName}`} />
                                )}
                              </div>
                            </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem value="no-locations" disabled>No locations available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Possession Section */}
              <div className="space-y-4 p-5 rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-transparent">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Possession
                </h3>
                <div className="space-y-2">
                  <Label>Possession Timeline (Select multiple)</Label>

                  {/* Selected possessions display */}
                  {newReqPreferences.possessions.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 border rounded bg-muted/30">
                      {newReqPreferences.possessions.map((poss, idx) => (
                        <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                          {poss}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => {
                              setNewReqPreferences({
                                ...newReqPreferences,
                                possessions: newReqPreferences.possessions.filter((_, i) => i !== idx)
                              });
                            }}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Possession dropdown with multiple selection */}
                  <Select
                    value=""
                    onValueChange={value => {
                      if (value && !newReqPreferences.possessions.includes(value)) {
                        setNewReqPreferences({
                          ...newReqPreferences,
                          possessions: [...newReqPreferences.possessions, value],
                          possessionTimeline: newReqPreferences.possessions.length === 0 ? value : newReqPreferences.possessions.join(', ')
                        });
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-possession">
                      <SelectValue placeholder={
                        newReqPreferences.possessions.length > 0
                          ? `${newReqPreferences.possessions.length} possession timeline(s) selected`
                          : "Click to add possession timelines"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {["Not decided yet", "Ready to Move In", "Under 6 Months", "Under 1 Year", "Under 2 Years", "More than 2 Years"]
                        .filter(poss => !newReqPreferences.possessions.includes(poss))
                        .map((poss, index) => (
                          <SelectItem key={index} value={poss}>
                            {poss}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Configuration Section */}
              <div className="space-y-4 p-5 rounded-lg border-2 border-green-200 bg-gradient-to-br from-green-50/50 to-transparent">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  Configuration
                </h3>
                <div className="space-y-2">
                  <Label>Property Configuration (Select multiple)</Label>

                  {/* Selected configurations display */}
                  {newReqPreferences.configurations.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 border rounded bg-muted/30">
                      {newReqPreferences.configurations.map((config, idx) => (
                        <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                          {config}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => {
                              setNewReqPreferences({
                                ...newReqPreferences,
                                configurations: newReqPreferences.configurations.filter((_, i) => i !== idx)
                              });
                            }}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Configuration dropdown with multiple selection */}
                  <Select
                    value=""
                    onValueChange={value => {
                      if (value && !newReqPreferences.configurations.includes(value)) {
                        setNewReqPreferences({
                          ...newReqPreferences,
                          configurations: [...newReqPreferences.configurations, value],
                          configuration: newReqPreferences.configurations.length === 0 ? value : newReqPreferences.configurations.join(', ')
                        });
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-configuration">
                      <SelectValue placeholder={
                        newReqPreferences.configurations.length > 0
                          ? `${newReqPreferences.configurations.length} configuration(s) selected`
                          : "Click to add configurations"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {["1 BHK", "1.5 BHK", "2 BHK", "2.5 BHK", "3 BHK", "3.5 BHK", "4 BHK", "4.5 BHK", "5 BHK", "6 BHK"]
                        .filter(config => !newReqPreferences.configurations.includes(config))
                        .map((config, index) => (
                          <SelectItem key={index} value={config}>
                            {config}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Property Type Section */}
              <div className="space-y-4 p-5 rounded-lg border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-transparent">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  Property Type
                </h3>
                <div>
                  <Label>Type of Property</Label>
                  <select
                    value={newReqPreferences.propertyType || ""}
                    onChange={e => setNewReqPreferences({ ...newReqPreferences, propertyType: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent"
                  >
                    <option value="">Select property type</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Villa">Villa</option>
                    <option value="Villa-Apartment">Villa-Apartment</option>
                  </select>
                </div>
              </div>

              {/* Property Size Section */}
              <div className="space-y-4 p-5 rounded-lg border-2 border-cyan-200 bg-gradient-to-br from-cyan-50/50 to-transparent">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-600">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                  Property Size
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Min Size (SqFt)</Label>
                    <Input
                      value={newReqPreferences.sizeMin || ""}
                      onChange={e => setNewReqPreferences({ ...newReqPreferences, sizeMin: e.target.value })}
                      placeholder="e.g., 1000"
                      type="number"
                    />
                  </div>
                  <div>
                    <Label>Max Size (SqFt)</Label>
                    <Input
                      value={newReqPreferences.sizeMax || ""}
                      onChange={e => setNewReqPreferences({ ...newReqPreferences, sizeMax: e.target.value })}
                      placeholder="e.g., 2000"
                      type="number"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-muted/20">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddReqDialog(false);
                    setEditingRequirementId(null);
                  }}
                  disabled={isCreatingRequirement}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingRequirementId ? handleUpdateRequirement : handleAddRequirement}
                  disabled={isCreatingRequirement}
                  data-testid="button-submit-requirement"
                  className="px-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                >
                  {isCreatingRequirement ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {editingRequirementId ? "Updating..." : "Creating..."}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {editingRequirementId ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Update Requirement
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                          Create Requirement
                        </>
                      )}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Matched Properties Dialog */}
      <Dialog open={matchedPropertiesDialog} onOpenChange={(open) => {
        setMatchedPropertiesDialog(open);
        if (!open) {
          // Clear the fetched properties when dialog is closed
          setAllMatchedProperties([]);
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              Matched Properties ({loadingAllProperties ? '...' : allMatchedProperties.length})
            </DialogTitle>
            <DialogDescription>
              All unique properties matching the requirement preferences
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 px-1">
            {loadingAllProperties ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-4 text-muted-foreground">Loading all matched properties...</p>
              </div>
            ) : allMatchedProperties.length > 0 ? (
              allMatchedProperties.map((property: Property, index: number) => (
                <div
                  key={property.id || index}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (property._id) {
                      const baseUrl = 'https://relai.world';
                      const directUrl = `${baseUrl}/property/${property._id}`;
                      window.open(directUrl, '_blank');
                    }
                  }}
                  data-testid={`property-card-${property.id || index}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg text-primary">
                          {property.ProjectName || "Unknown Project"}
                        </h3>
                        {property.source === 'bot' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                            Bot Suggested
                          </span>
                        )}
                        {property.source === 'dynamic' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                            Dynamic Match
                          </span>
                        )}
                        {property.source === 'bot+dynamic' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                            Bot + Match
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {property.AreaName || "Location not specified"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-success">
                        {property['Base Project Price']
                          ? `₹${(parseInt(property['Base Project Price']) / 10000000).toFixed(2)} Cr`
                          : "Price N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">BHK:</span>
                      <p className="text-foreground">{property.BHK || "N/A"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">SQ FEET:</span>
                      <p className="text-foreground">{property['SQ FEET'] || "N/A"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Property Type:</span>
                      <p className="text-foreground">{property.property_type || "N/A"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Possession Date:</span>
                      <p className="text-foreground">{property.Possession_Date || "N/A"}</p>
                    </div>
                    {property.Builder_Name && (
                      <div>
                        <span className="font-medium text-muted-foreground">Builder Name:</span>
                        <p className="text-foreground">{property.Builder_Name}</p>
                      </div>
                    )}
                    {property.RERA_ID && (
                      <div>
                        <span className="font-medium text-muted-foreground">RERA ID:</span>
                        <p className="text-foreground text-xs">{property.RERA_ID}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-50">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <p>No matched properties found</p>
                <p className="text-sm mt-2">Try adjusting the requirement preferences to find matches</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setMatchedPropertiesDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Property Notes Dialog */}
      <Dialog open={propertyNotesDialog} onOpenChange={setPropertyNotesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Property Notes - {currentPropertyForNotes?.title || "Property"}
            </DialogTitle>
            <DialogDescription>
              Add your personal notes and observations about this property
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Property Info Summary */}
            {currentPropertyForNotes && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Price:</span> {currentPropertyForNotes.price}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> {currentPropertyForNotes.address}
                  </div>
                  <div>
                    <span className="font-medium">Configuration:</span> {currentPropertyForNotes.bedrooms}BHK
                  </div>
                  <div>
                    <span className="font-medium">Size:</span> {currentPropertyForNotes.sqft}
                  </div>
                </div>
              </div>
            )}

            {/* Notes Textarea */}
            <div className="space-y-2">
              <Label htmlFor="property-notes">Your Notes</Label>
              <Textarea
                id="property-notes"
                placeholder="Write your notes about this property... (e.g., Pros and cons, visit impressions, client feedback, etc.)"
                value={propertyNoteText}
                onChange={(e) => setPropertyNoteText(e.target.value)}
                className="min-h-[200px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                These notes are saved locally and are specific to this property.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setPropertyNotesDialog(false)}
              disabled={isSavingNote}
            >
              Cancel
            </Button>
            <Button
              onClick={savePropertyNoteHandler}
              disabled={isSavingNote}
            >
              {isSavingNote ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WebBotChatHistory({ clientId }: { clientId: string | undefined }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [open, setOpen] = useState<boolean>(false);
  useEffect(() => {
    if (!clientId) return;
    const stored = localStorage.getItem(LOCALSTORAGE_PREFIX + clientId);
    if (stored) setMessages(JSON.parse(stored));
  }, [clientId]);
  if (!clientId) return null;
  return (
    <div className="border rounded shadow-sm bg-white mt-4">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted"
        onClick={() => setOpen(o => !o)}
      >
        <div className="font-semibold text-lg">WebBot Chat History</div>
        <span className="ml-2">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="p-4 border-t bg-muted/50">
          {messages.length === 0 ? (
            <div className="text-muted-foreground text-sm">No WebBot chat history for this client.</div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-lg px-3 py-2 max-w-xs ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'}`}>
                    <div className="text-xs opacity-70 mb-1">{msg.sender === 'user' ? 'You' : 'WebBot'} &middot; {new Date(msg.timestamp).toLocaleString()}</div>
                    <div>{msg.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}