const START_CALL_TYPES = ["join_call", "start_call", "join_voice_channel"];
const END_CALL_TYPES = [
  "leave_voice_channel",
  "voice_disconnect",
  "video_stream_ended",
];

export type CallResult = {
  callStart: string;
  callEnd: string;
  duration: string;
};

export type DebugLog = {
  eventFiles: {
    name: string;
    size: number;
  }[];
  sharedChannelIds: string[];
  nEventsInSharedChannels: number;
  nCallEventsInSharedChannels: number;
  nCalculatedCalls: number;
};

export const processAnalytics = async (
  uploadedFiles: File[],
  sharedChannelIds: string[]
): Promise<[CallResult[], DebugLog]> => {
  const debugLog: DebugLog = {
    eventFiles: [],
    sharedChannelIds: [...sharedChannelIds],
    nEventsInSharedChannels: 0,
    nCallEventsInSharedChannels: 0,
    nCalculatedCalls: 0,
  };

  console.log("INFO: Begin processing analytics");
  // --- READ EVENT FILES AND EXTRACT RELEVANT EVENTS TO CHANNELS
  const analyticsEvents: any[] = [];
  for (const eventFile of uploadedFiles.filter((f) =>
    f.name.startsWith("events")
  )) {
    console.log("Reading file: " + eventFile.name);
    debugLog.eventFiles.push({ name: eventFile.name, size: eventFile.size });

    const eventFileContent = await eventFile.text();
    const lines = eventFileContent.split("\n");
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (line.length === 0) {
        continue;
      }

      const event = JSON.parse(trimmedLine);
      if (event["domain"] != "Reporting") {
        continue;
      }

      if (
        sharedChannelIds.includes(event["channel"]) ||
        sharedChannelIds.includes(event["channel_id"])
      ) {
        analyticsEvents.push(event);
      }
    }
  }

  console.log("Found " + analyticsEvents.length + " events in shared channels");
  debugLog.nEventsInSharedChannels = analyticsEvents.length;

  // --- FILTER OUT ONLY VOICE-CALL EVENTS
  const callEvents = analyticsEvents
    .filter((e) => {
      const eventType = e["event_type"];
      return (
        START_CALL_TYPES.includes(eventType) ||
        END_CALL_TYPES.includes(eventType)
      );
    })
    .sort((a, b) => (a["timestamp"] < b["timestamp"] ? -1 : 0));

  console.log("Of those, " + callEvents.length + " were related to calls");
  debugLog.nCallEventsInSharedChannels = callEvents.length;

  // --- MATCH START-CALL AND END-CALL EVENTS
  const matchedCallEvents = callEvents.reduce<{
    startCallEvent: any;
    callPairs: [any, any][];
  }>(
    (acc, currentEvent) => {
      const eventType = currentEvent["event_type"];
      if (START_CALL_TYPES.includes(eventType)) {
        return {
          startCallEvent: acc.startCallEvent || currentEvent,
          callPairs: acc.callPairs,
        };
      }

      if (!acc.startCallEvent) {
        return acc;
      }

      return {
        startCallEvent: null,
        callPairs: [...acc.callPairs, [acc.startCallEvent, currentEvent]],
      };
    },
    { startCallEvent: null, callPairs: [] }
  ).callPairs;

  // --- CONVERT EVENT-PAIRS TO RESULTS
  const callResults = matchedCallEvents.map(([start, end]) => {
    const startTime = JSON.parse(start["timestamp"]);
    const endTime = JSON.parse(end["timestamp"]);
    const durationMs = Date.parse(endTime) - Date.parse(startTime);
    const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor(
      ((durationMs % (1000 * 60 * 60 * 24)) % (1000 * 60 * 60)) / (1000 * 60)
    );

    return {
      callStart: startTime,
      callEnd: endTime,
      duration: `${days !== 0 ? days + "d " : ""}${
        hours !== 0 ? hours + "h " : ""
      }${minutes !== 0 ? minutes + "m" : ""}`,
    };
  });

  // --- Remove calls with no duration
  const results = callResults.filter((cr) => cr.duration !== "");

  console.log("Found " + results.length + " calls");
  console.log("INFO: Finished processing");
  debugLog.nCalculatedCalls = results.length;
  return [results, debugLog];
};
