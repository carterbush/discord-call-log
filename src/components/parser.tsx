import React from "react";
import { DropzoneArea } from "mui-file-dropzone";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Paper,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { CallResult, processAnalytics } from "@/parser-logic";

type Relationship = {
  id: string;
  nickname: string | null;
  user: {
    id: string;
    username: string;
    display_name: string;
    discriminator: string;
  };
};

const Parser: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);
  const [myUserId, setMyUserId] = React.useState<string>("");
  const [relationships, setRelationships] = React.useState<Relationship[]>([]);
  const [theirUserIds, setTheirUserIds] = React.useState<string[]>([]);
  React.useState<boolean>(false);
  const [sharedChannelIds, setSharedChannelIds] = React.useState<string[]>([]);
  const [callResults, setCallResults] = React.useState<CallResult[]>([]);
  const [isProcessingAnalytics, setIsProcessingAnalytics] =
    React.useState<boolean>(false);

  const handleFileUpload = React.useCallback(
    async (files: File[]) => {
      setUploadedFiles(files);

      const userFile = files.filter((f) => f.name === "user.json")[0];
      if (userFile) {
        const userFileContents = JSON.parse(await userFile.text());
        setMyUserId(userFileContents["id"] as string);
        setRelationships(userFileContents["relationships"] as Relationship[]);
      }
    },
    [setUploadedFiles, setMyUserId, setRelationships]
  );

  const onSelectTheirId = React.useCallback(
    (id: string) => () => {
      const currentIndex = theirUserIds.indexOf(id);
      const newChecked = [...theirUserIds];

      if (currentIndex === -1) {
        newChecked.push(id);
      } else {
        newChecked.splice(currentIndex, 1);
      }

      setTheirUserIds(newChecked);
    },
    [theirUserIds, setTheirUserIds]
  );

  const processChannels = React.useCallback(async () => {
    const sharedChannelIds: string[] = [];

    const channelFiles = uploadedFiles.filter((f) => f.name === "channel.json");
    for (const channelFile of channelFiles) {
      const channelFileContents = JSON.parse(await channelFile.text());
      const recipients = channelFileContents["recipients"] as string[];

      if (
        recipients &&
        recipients.indexOf(myUserId) >= 0 &&
        recipients.filter((r) => theirUserIds.includes(r)).length > 0
      ) {
        sharedChannelIds.push(channelFileContents["id"]);
      }
    }

    setSharedChannelIds(sharedChannelIds);
  }, [uploadedFiles, myUserId, theirUserIds, setSharedChannelIds]);

  const onProcessAnalytics = async () => {
    setIsProcessingAnalytics(true);
    const results = await processAnalytics(uploadedFiles, sharedChannelIds);
    setCallResults(results);
    setIsProcessingAnalytics(false);
  };

  const downloadResults = React.useCallback(async () => {
    const fileContents = [
      "starttime,endtime,duration",
      ...callResults.map((cr) =>
        [cr.callStart, cr.callEnd, cr.duration].join(",")
      ),
    ].join("\n");
    const file = new Blob([fileContents], { type: "text/plain" });

    const tempAnchor = document.createElement("a");
    tempAnchor.href = URL.createObjectURL(file);
    tempAnchor.download = "call-log.csv";

    document.body.appendChild(tempAnchor);
    tempAnchor.click();
    document.body.removeChild(tempAnchor);
  }, [callResults]);

  return (
    <div>
      <Typography component="h2" variant="h5" sx={{ mt: 2, mb: 2 }}>
        Step One: Load your (unzipped) Discord data package
      </Typography>
      {uploadedFiles.length == 0 ? (
        <DropzoneArea
          acceptedFiles={[".json", ".csv"]}
          dropzoneText={"Drag your Discord package folder here."}
          filesLimit={10000}
          maxFileSize={500 * 1000 * 1000}
          fileObjects={uploadedFiles}
          onChange={handleFileUpload}
          showPreviewsInDropzone={false}
          showAlerts={false}
        />
      ) : (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>
              There are {uploadedFiles.length} files uploaded. Refresh the page
              to remove them and start again.
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {uploadedFiles.map((f, i) => (
                <ListItem key={`file-${i}`}>{f.name}</ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}
      <Divider sx={{ mt: 2 }} />
      <Typography component="h2" variant="h5" sx={{ mt: 2, mb: 2 }}>
        Step Two: Select the users that you are interested in
      </Typography>
      {relationships.length !== 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>
              You have selected {theirUserIds.length} user(s) so far. Open this
              accordion to select them.
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {relationships
                .sort((a, b) =>
                  a.user.username.toLowerCase() < b.user.username.toLowerCase()
                    ? -1
                    : 1
                )
                .map((r, i) => (
                  <ListItem key={`relationship-${i}`}>
                    <ListItemButton
                      role={undefined}
                      onClick={onSelectTheirId(r.id)}
                      dense
                    >
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={theirUserIds.indexOf(r.id) !== -1}
                          tabIndex={-1}
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemText
                        id={r.id}
                        primary={`${r.user.username}${
                          r.user.discriminator !== "0000"
                            ? `#${r.user.discriminator}`
                            : ""
                        } ${r.nickname ? `(${r.nickname})` : ""} ${
                          r.user.display_name ? `(${r.user.display_name})` : ""
                        }`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}
      <Divider sx={{ mt: 2 }} />
      <Typography component="h2" variant="h5" sx={{ mt: 2, mb: 2 }}>
        Step Three: Press the button to find shared channels
      </Typography>
      {theirUserIds.length !== 0 && (
        <Button variant="contained" onClick={processChannels} sx={{ mb: 2 }}>
          Begin processing channels
        </Button>
      )}
      {sharedChannelIds.length !== 0 && (
        <Alert severity="success">
          Found {sharedChannelIds.length} channel(s) where you and at least one
          of your selected users are participants, out of a total of{" "}
          {uploadedFiles.filter((f) => f.name === "channel.json").length}{" "}
          channels.
        </Alert>
      )}
      <Divider sx={{ mt: 2 }} />
      <Typography component="h2" variant="h5" sx={{ mt: 2, mb: 2 }}>
        Step Four: Press button to search the shared channels for call logs
      </Typography>
      {sharedChannelIds.length !== 0 && (
        <>
          <Button
            variant="contained"
            onClick={isProcessingAnalytics ? undefined : onProcessAnalytics}
            sx={{ mb: 2 }}
          >
            {isProcessingAnalytics
              ? "Working..."
              : "Begin processing call logs"}
          </Button>
          {callResults.length === 0 && (
            <Alert severity="info">This can take some time</Alert>
          )}
        </>
      )}
      {callResults.length !== 0 && (
        <Alert severity="success">Found {callResults.length} calls</Alert>
      )}
      <Divider sx={{ mt: 2 }} />
      <Typography component="h2" variant="h5" sx={{ mt: 2, mb: 2 }}>
        Step Five: Your calls are shown here (times are in UTC time)
      </Typography>
      {callResults.length !== 0 && (
        <Button variant="contained" onClick={downloadResults} sx={{ mb: 2 }}>
          Download call log as CSV
        </Button>
      )}
      {callResults.length !== 0 && (
        <Paper>
          <List>
            {callResults.map((cr, i) => (
              <ListItem key={`call-${i}`}>
                <Typography component="p">
                  {cr.callStart} to {cr.callEnd} ({cr.duration})
                </Typography>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </div>
  );
};

export default Parser;
