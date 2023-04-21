import Head from "next/head";
import styles from "@/styles/Home.module.css";
import Parser from "@/components/parser";
import { Button, Typography, Paper } from "@mui/material";
import { Launch } from "@mui/icons-material";

export default function Home() {
  return (
    <>
      <Head>
        <title>Discord Call Log Parser</title>
        <meta
          name="description"
          content="Get a list of calls between two people from a Discord package"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔔</text></svg>"
        />
      </Head>
      <main className={styles.main}>
        <Paper sx={{ p: 5, backgroundColor: "#FAF9F6" }}>
          <Typography variant="h3" component="h1" gutterBottom={true}>
            Discord Call Log Parser
          </Typography>
          <div>
            <Button
              variant="outlined"
              href="https://github.com/carterbush/discord-call-log"
              target="_blank"
              endIcon={<Launch />}
              sx={{ mr: 2 }}
            >
              View the code on GitHub
            </Button>
            <Button
              variant="outlined"
              href="https://www.buymeacoffee.com/venzael"
              target="_blank"
              endIcon={<Launch />}
            >
              Buy me a coffee
            </Button>
          </div>
          <Typography component="p" sx={{ mt: 2 }}>
            This is a webapp to help people get a list of calls between two
            people from a Discord package. I can't guarantee complete
            correctness, and if you have situations where you've had group calls
            that might show up weirdly, but it was enough for my partner and I
            to get our visa!
          </Typography>
          <Typography component="p">
            This app doesn't communicate with a server, so your data is safely
            in your own browser - this app is just here to help you out. The
            code for this app is publicly available on my GitHub, linked above.
          </Typography>
          <Typography>
            If this tool helped you out and you're feeling generous, you can
            also buy me a coffee - also linked above.
          </Typography>
          <Parser />
        </Paper>
      </main>
    </>
  );
}
