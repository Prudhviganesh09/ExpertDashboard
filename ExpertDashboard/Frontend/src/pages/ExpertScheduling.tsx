import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Plus, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/config/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface ExpertSchedulingProps {
  clientId: string;
  clientName: string;
}

interface Expert {
  email: string;
  name: string;
}

interface ExpertMeeting {
  _id: string;
  clientId: string;
  clientName: string;
  expertEmail: string;
  expertName: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  createdAt: string;
  googleCalendarEventId?: string;
}

export default function ExpertScheduling({ clientId, clientName }: ExpertSchedulingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  // client email removed from the UI and payload

  const { data: expertsData, isLoading: loadingExperts } = useQuery<{ success: boolean; experts: Expert[] }>({
    queryKey: ['experts'],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.EXPERTS);
      if (!response.ok) {
        throw new Error('Failed to fetch experts');
      }
      return response.json();
    },
  });

  const { data: meetingsData, isLoading: loadingMeetings } = useQuery<{ success: boolean; meetings: ExpertMeeting[] }>({
    queryKey: ['expert-meetings', clientId],
    // Only run this query when a valid clientId is available
    enabled: !!clientId,
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.EXPERT_MEETINGS.LIST(clientId));

      // Try to read body for helpful errors when available
      if (!response.ok) {
        let errBody = null;
        try {
          errBody = await response.json();
        } catch (_) {
          // ignore JSON parse errors
        }

        const errMsg = errBody?.message || errBody?.error || `Failed to fetch expert meetings (status ${response.status})`;
        throw new Error(errMsg);
      }

      return response.json();
    },
  });

  const { data: allMeetingsData } = useQuery<{ success: boolean; meetings: ExpertMeeting[] }>({
    queryKey: ['all-expert-meetings', selectedDate],
    queryFn: async () => {
      if (!selectedDate) {
        return { success: true, meetings: [] };
      }

      // Fetch meetings for ALL experts on the selected date
      const response = await fetch(`${API_ENDPOINTS.EXPERT_MEETINGS.CREATE}?date=${encodeURIComponent(selectedDate)}`);

      if (!response.ok) {
        let errBody = null;
        try { errBody = await response.json(); } catch (_) { }
        const errMsg = errBody?.message || errBody?.error || `Failed to fetch meetings (status ${response.status})`;
        throw new Error(errMsg);
      }

      return response.json();
    },
    enabled: !!selectedDate,
  });

  // Auto-select first expert when experts load
  useEffect(() => {
    if (expertsData?.experts && expertsData.experts.length > 0 && !selectedExpert) {
      setSelectedExpert(expertsData.experts[0].email);
    }
  }, [expertsData, selectedExpert]);

  const scheduleMutation = useMutation({
    mutationFn: async (meetingData: {
      clientId: string;
      clientName: string;
      expertEmail: string;
      startTime: string;
    }) => {
      const response = await fetch(API_ENDPOINTS.EXPERT_MEETINGS.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meetingData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to schedule meeting');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expert-meetings', clientId] });

      let description = `Your call with ${data.meeting.expertName} has been scheduled.`;

      if (data.emailSent) {
        description += ` A confirmation email has been sent.`;
      } else if (data.warning) {
        // keep the warning if any, but avoid exposing email addresses
        description += ` However, there was an issue sending the confirmation email.`;
      }

      if (data.calendarSynced === false || data.warning) {
        toast({
          title: "Meeting Scheduled (Calendar Issue)",
          description: data.warning || "Meeting saved but not added to expert's calendar.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Meeting Scheduled",
          description: description,
        });
      }

      setScheduleDialog(false);
      setSelectedExpert("");
      setSelectedDate("");
      setSelectedTime("");
    },
    onError: (error: Error) => {
      toast({
        title: "Scheduling Failed",
        description: error.message || "Failed to schedule the meeting. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleScheduleMeeting = () => {
    if (!selectedExpert || !selectedDate || !selectedTime) {
      toast({
        title: "Missing Information",
        description: "Please select an expert, date, and time.",
        variant: "destructive",
      });
      return;
    }

    const dateTime = new Date(`${selectedDate}T${selectedTime}`);

    if (dateTime < new Date()) {
      toast({
        title: "Invalid Date/Time",
        description: "Please select a future date and time.",
        variant: "destructive",
      });
      return;
    }

    scheduleMutation.mutate({
      clientId,
      clientName,
      expertEmail: selectedExpert,
      startTime: dateTime.toISOString(),
    });
  };

  const experts = expertsData?.experts || [];
  const meetings = meetingsData?.meetings || [];
  const upcomingMeetings = meetings.filter(m => new Date(m.startTime) > new Date());

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return format(date, "MMM dd, yyyy 'at' hh:mm a");
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 10; hour < 19; hour++) {
      for (let minute of [0, 15, 30, 45]) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = format(new Date(`2000-01-01T${timeStr}`), 'h:mm a');
        slots.push({ value: timeStr, label: displayTime });
      }
    }
    return slots;
  };

  const getTimeSlotBookingCount = (timeSlot: string) => {
    if (!selectedExpert || !selectedDate || !allMeetingsData?.meetings) {
      return 0;
    }

    const slotDateTime = new Date(`${selectedDate}T${timeSlot}`);

    let count = 0;
    allMeetingsData.meetings.forEach(meeting => {
      const meetingStart = new Date(meeting.startTime);

      // Only count if this exact time slot matches the meeting start time
      if (slotDateTime.getTime() === meetingStart.getTime()) {
        count++;
      }
    });

    return count;
  };

  const isTimeSlotDisabled = (timeSlot: string) => {
    if (!selectedExpert || !selectedDate || !allMeetingsData?.meetings) {
      return false;
    }

    const slotDateTime = new Date(`${selectedDate}T${timeSlot}`);
    const slotEndTime = new Date(slotDateTime.getTime() + 45 * 60000); // 45 min meeting
    const slotBufferEnd = new Date(slotEndTime.getTime() + 15 * 60000); // +15 min buffer

    // Count all meetings that would conflict with this time slot
    let conflictCount = 0;
    allMeetingsData.meetings.forEach(meeting => {
      const meetingStart = new Date(meeting.startTime);
      const meetingEnd = new Date(meeting.endTime); // Meeting end (start + 45 min)
      const meetingBufferEnd = new Date(meetingEnd.getTime() + 15 * 60000); // Meeting end + 15 min buffer

      // Check if this time slot overlaps with the meeting or its buffer
      const hasConflict = (
        (slotDateTime >= meetingStart && slotDateTime < meetingBufferEnd) ||
        (meetingStart >= slotDateTime && meetingStart < slotBufferEnd)
      );

      if (hasConflict) {
        conflictCount++;
      }
    });

    // Disable only if conflict count equals or exceeds the number of experts
    // Default to 1 if experts list is empty to be safe, though it should be populated
    const maxConcurrentMeetings = experts.length > 0 ? experts.length : 1;
    return conflictCount >= maxConcurrentMeetings;
  };

  const getTimeSlotTotalBookings = (timeSlot: string) => {
    if (!selectedExpert || !selectedDate || !allMeetingsData?.meetings) {
      return 0;
    }

    const slotDateTime = new Date(`${selectedDate}T${timeSlot}`);
    const slotEndTime = new Date(slotDateTime.getTime() + 45 * 60000); // 45 min meeting
    const slotBufferEnd = new Date(slotEndTime.getTime() + 15 * 60000); // +15 min buffer

    // Count unique experts that have meetings conflicting with this time slot
    const bookedExperts = new Set<string>();
    allMeetingsData.meetings.forEach(meeting => {
      const meetingStart = new Date(meeting.startTime);
      const meetingEnd = new Date(meeting.endTime);
      const meetingBufferEnd = new Date(meetingEnd.getTime() + 15 * 60000);

      const hasConflict = (
        (slotDateTime >= meetingStart && slotDateTime < meetingBufferEnd) ||
        (meetingStart >= slotDateTime && meetingStart < slotBufferEnd)
      );

      if (hasConflict) {
        bookedExperts.add(meeting.expertEmail);
      }
    });

    return bookedExperts.size;
  };

  const timeSlots = useMemo(() => generateTimeSlots(), []);

  const availableTimeSlots = useMemo(() => {
    return timeSlots.map(slot => ({
      ...slot,
      bookingCount: getTimeSlotTotalBookings(slot.value),
      isDisabled: isTimeSlotDisabled(slot.value)
    }));
  }, [timeSlots, selectedExpert, selectedDate, allMeetingsData]);

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-blue-500/10 flex items-center justify-center">
            <CalendarIcon className="h-10 w-10 text-blue-500" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-2">Schedule Expert Call</h2>
            <p className="text-muted-foreground">
              Book a 45-minute consultation with our real estate experts
            </p>
          </div>
          <Button
            size="lg"
            className="text-lg px-8 py-6"
            onClick={() => setScheduleDialog(true)}
            data-testid="button-schedule-expert"
          >
            <CalendarIcon className="h-5 w-5 mr-2" />
            Schedule Call
          </Button>
        </CardContent>
      </Card>

      {upcomingMeetings.length > 0 && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Scheduled Expert Calls ({upcomingMeetings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingMeetings.map((meeting) => (
              <div
                key={meeting._id}
                className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                data-testid={`card-expert-meeting-${meeting._id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{meeting.expertName}</span>
                      <Badge variant="outline">{meeting.duration} minutes</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{formatDateTime(meeting.startTime)}</span>
                    </div>
                    {/* expert email removed from UI */}
                  </div>
                  <Badge variant={meeting.status === 'scheduled' ? 'default' : 'secondary'}>
                    {meeting.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule Expert Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-date">Date</Label>
              <Input
                id="meeting-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                data-testid="input-meeting-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-time">Session Time</Label>
              <Select
                value={selectedTime}
                onValueChange={setSelectedTime}
                disabled={!selectedDate}
              >
                <SelectTrigger id="meeting-time" data-testid="select-meeting-time">
                  <SelectValue placeholder="Select a time slot" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {availableTimeSlots.map((slot) => (
                    <SelectItem
                      key={slot.value}
                      value={slot.value}
                      disabled={slot.isDisabled}
                      className={slot.isDisabled ? "text-muted-foreground" : ""}
                    >
                      {slot.label} {slot.bookingCount > 0 && `(${slot.bookingCount} Booked)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Meeting duration: 45 minutes with 15-minute gap between meetings
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setScheduleDialog(false)}
                disabled={scheduleMutation.isPending}
                data-testid="button-cancel-schedule"
              >
                Cancel
              </Button>
              <Button
                onClick={handleScheduleMeeting}
                disabled={scheduleMutation.isPending}
                data-testid="button-confirm-schedule"
              >
                {scheduleMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
