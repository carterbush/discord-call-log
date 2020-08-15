using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using Newtonsoft.Json.Linq;

namespace DiscordMessageParser
{
    public class Program
    {
        const string DiscordPackagePath = @""; // your path here

        static void Main(string[] args)
        {
            var userData = File.ReadAllText(Path.Combine(DiscordPackagePath, "account", "user.json"));
            var user = JObject.Parse(userData);
            var myId = user["id"].ToString();
            var theirNames = new HashSet<string>(); // fill me in
            var theirIds = user["relationships"].Where(u => theirNames.Contains(u["user"]["username"].ToString())).Select(x => x["id"].ToString());

            Console.WriteLine($"My id: {myId}");
            Console.WriteLine($"Their ids: {string.Join(", ", theirIds.ToArray())}");

            var ourDmChannelIds = new List<string>();
            foreach (var dir in Directory.GetDirectories(Path.Combine(DiscordPackagePath, "messages"))) {
                var channelData = File.ReadAllText(Path.Combine(dir, "channel.json"));
                var channel = JObject.Parse(channelData);
                var recipients = channel["recipients"] as JArray;
                if (recipients == null || recipients.Count != 2) continue;

                var rs = recipients.Select(r => r.ToString()).ToHashSet();
                if (!rs.Contains(myId) || !rs.Intersect(theirIds).Any()) continue;

                ourDmChannelIds.Add(channel["id"].ToString());
            }

            Console.WriteLine($"Our DM channel ids: {string.Join(", ", ourDmChannelIds.ToArray())}");

            var analytics = new JArray();
            foreach (var line in  File.ReadLines(Path.Combine(DiscordPackagePath, "activity", "analytics", "events-2020-00000-of-00001.json")))
            {
                var obj = JObject.Parse(line);
                var channel = obj["channel"]?.ToString();
                if (channel != null && ourDmChannelIds.Contains(channel))
                {
                    analytics.Add(obj);
                }

                var channel_id = obj["channel_id"]?.ToString();
                if (channel_id != null && ourDmChannelIds.Contains(channel_id))
                {
                    analytics.Add(obj);
                }
            }

            var eventTypes = new Dictionary<string, int>(); analytics.Select(a => a["event_type"].ToString()).ToHashSet();
            foreach (var a in analytics)
            {
                var et = a["event_type"].ToString();
                if (eventTypes.ContainsKey(et))
                {
                    eventTypes[et]++;
                } else
                {
                    eventTypes[et] = 1;
                }
            }

            var callTypes = new HashSet<string>()
            {
                "join_call",
                "start_call",
                //"ring_call",
            };

            var endCallTypes = new HashSet<string>()
            {
                "leave_voice_channel",
                "voice_disconnect",
                "video_stream_ended",
            };

            var callEvents = analytics.Where(a => callTypes.Contains(a["event_type"].ToString()) ||
                                                  endCallTypes.Contains(a["event_type"].ToString())
                                             ).OrderBy(a => a["timestamp"]);

            //foreach (var callEvent in callEvents.Take(50))
            //{
            //    Console.WriteLine(string.Join(",", callEvent["timestamp"], callEvent["event_type"]));
            //}

            var currCall = null as JToken;
            var lastEndCall = null as JToken;
            foreach (var evnt in callEvents)//.Take(50))
            {
                // Console.WriteLine($"{evnt["timestamp"].ToString()} {evnt["event_type"].ToString()}");
                if (callTypes.Contains(evnt["event_type"].ToString()))
                {
                    if (currCall == null)
                    {
                        currCall = evnt;
                    }
                    else
                    {
                        var callStartStr = currCall["timestamp"].ToString();
                        var callEndStr = lastEndCall["timestamp"].ToString();
                        var callStart = DateTime.Parse(callStartStr.Substring(1, callStartStr.Length - 2));
                        var callEnd = DateTime.Parse(callEndStr.Substring(1, callEndStr.Length - 2));
                        var callDuration = callEnd.Subtract(callStart);

                        var hours = callDuration.Hours > 0 ? $"{callDuration.Hours}h" : "";
                        var minutes = callDuration.Minutes > 0 ? $"{callDuration.Minutes}m" : "";
                        var durationComponent = string.Join(" ", hours, minutes);
                        if (string.IsNullOrWhiteSpace(durationComponent))
                        {
                            // Call was under a minute, discard it
                            currCall = null;
                            lastEndCall = null;
                            continue;
                        }

                        Console.WriteLine(string.Join(",", callStart.ToString(), durationComponent.Trim(), callStart.ToLocalTime().TimeOfDay.ToString(), "Discord"));

                        currCall = evnt;
                    }
                }
                else if (endCallTypes.Contains(evnt["event_type"].ToString()))
                {
                    lastEndCall = evnt;
                }
            }
        }
    }
}
