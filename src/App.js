import { useState } from "react";
import {
  Button,
  Container,
  Grid,
  Header,
  Input,
  Segment,
} from "semantic-ui-react";
import { SkynetClient, parseSkylink, genKeyPairFromSeed } from "skynet-js";

import base64 from "base64-js";
import * as base32Encode from "base32-encode";

const client = new SkynetClient("https://siasky.net");

// decodeBase64 is a helper to decode a Base64 encoded Skylink
function decodeBase64(input = "") {
  if (!input) return;

  return base64.toByteArray(
    input.padEnd(input.length + 4 - (input.length % 4), "=")
  );
}

// encodeBase32 encodes a decoded skylink into a Base32 skylink
function encodeBase32(input) {
  if (!input) return;

  return base32Encode(input, "RFC4648-HEX", {
    padding: false,
  }).toLowerCase();
}

function App() {
  // App State
  const [copied, setCopied] = useState(false);
  const [dataKey, setDataKey] = useState("");
  const [registryURI, setRegistryURI] = useState("");
  const [seed, setSeed] = useState("");
  const [skylink, setSkylink] = useState("");

  // parseURI is a helper for parsing the skyns URI from the URL
  const parseURI = (url) => {
    if (!url) return;

    // Split the url into the query keypairs
    let keypairs = url.split("?")[1].split("&");
    let pk = keypairs[0];
    let dk = keypairs[1];
    let uri = `skyns://${pk.split("=")[1]}/${dk.split("=")[1]}`;
    setRegistryURI(uri);
    console.log(`Update namebase HNS record with: ${uri}`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setCopied(false);
    setRegistryURI("");

    // generate base32 skylink from base64 skylink
    const rawSkylink = parseSkylink(skylink);
    const skylinkDecoded = decodeBase64(rawSkylink);
    const skylinkEncodedBase32 = encodeBase32(skylinkDecoded);
    const skylinkUrl = `https://${skylinkEncodedBase32}.siasky.net`;

    console.log(`Base32 Skylink: ${skylinkUrl}`);

    if (!seed || !dataKey) {
      console.log("Need seed and datakey for registry updates");
      return;
    }
    try {
      // Generate the public and private keys
      const { publicKey, privateKey } = genKeyPairFromSeed(seed);

      // Grab the registry entry if it exists and update the revision number
      const { entry } = await client.registry.getEntry(publicKey, dataKey);
      const revision = entry ? entry.revision + BigInt(1) : BigInt(0);

      // Update the entry in the registry
      const updatedEntry = { datakey: dataKey, revision, data: rawSkylink };
      await client.registry.setEntry(privateKey, updatedEntry);

      // Get the url for the registry entry
      const entryUrl = client.registry.getEntryUrl(publicKey, dataKey);
      console.log(`Registry entry updated: ${entryUrl}`);

      // Log out the pubkey and data key
      parseURI(entryUrl);
    } catch (error) {
      console.log(`Failed to update registry entry ${error.message}`);
    }
  };

  return (
    <Container style={{ marginTop: "1em" }}>
      <Header as="h1">Skynet Registry Manager</Header>
      <Grid columns={1}>
        <Grid.Row>
          <Input
            focus
            placeholder="Seed..."
            onChange={(e) => {
              setSeed(e.target.value);
            }}
          />
        </Grid.Row>
        <Grid.Row>
          <Input
            focus
            placeholder="DataKey..."
            onChange={(e) => {
              setDataKey(e.target.value);
            }}
          />
        </Grid.Row>
        <Grid.Row>
          <Input
            focus
            placeholder="Skylink..."
            onChange={(e) => {
              setSkylink(e.target.value);
            }}
          />
        </Grid.Row>
        <Grid.Row>
          <Button onClick={handleSubmit}>Update Registry</Button>
        </Grid.Row>
        <Grid.Row>
          {registryURI && (
            <>
              <Button
                positive={copied}
                onClick={() => {
                  navigator.clipboard.writeText(registryURI);
                  setCopied(true);
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Segment style={{ "word-break": "break-all" }}>
                {registryURI}
              </Segment>
            </>
          )}
        </Grid.Row>
      </Grid>
    </Container>
  );
}

export default App;
