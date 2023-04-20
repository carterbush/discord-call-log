# discord-call-log

Parses the data package provided by Discord to get a record of calls between two people

I needed a log of the calls made between myself and someone else for an official document. Unfortunately Discord's data package doesn't provide that out of the box, and scrolling through message history looking for "ABC started a call for XYZ hours" sounded like a nightmare, so I made this.

Hopefully it comes in handy if anyone else is trying to do the same thing in the future.

## Development

This is a Nextjs app. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Opens on [http://localhost:3000](http://localhost:3000)
