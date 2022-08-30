// Build todoapp, the EASY way
import { gql, Engine } from "@dagger.io/dagger";

// Check for netlify token
if (!process.env.NETLIFY_AUTH_TOKEN) {
  console.log(
    "Missing netlify API token. Please set it to the env variable $NETLIFY_AUTH_TOKEN"
  );
  process.exit(1);
}

// Set default value if NETLIFY_SITE_NAME is unset
const netlifySiteName =
  process.env.NETLIFY_SITE_NAME ?? `${process.env.USER}-dagger-todoapp`;

console.log(
  process.env.NETLIFY_SITE_NAME
    ? `
		Using netlify site name: "${netlifySiteName}"
	`
    : `
		Netlify site name not specified in $NETLIFY_SITE_NAME.
		Defaulting to "${netlifySiteName}".
	`
);

const netlifyTokenCleartext = process.env.NETLIFY_AUTH_TOKEN;

// Start cloak engine
new Engine().run(async (client) => {
  // 1. Load netlify token into a secret
  const netlifyTokenSecret = await client
    .request(
      gql`
        query ($netlifyTokenCleartext: String!) {
          core {
            addSecret(plaintext: $netlifyTokenCleartext)
          }
        }
      `,
      {
        netlifyTokenCleartext,
      }
    )
    .then((result) => result.core.addSecret);

  // 2. Build with yarn and deploy to netlify
  const result = await client
    .request(
      gql`
        query deploy(
          $netlifySiteName: String!
          $netlifyTokenSecret: SecretID!
        ) {
          host {
            workdir {
              read {
                yarn(runArgs: ["build"]) {
                  netlifyDeploy(
                    subdir: "build"
                    siteName: $netlifySiteName
                    token: $netlifyTokenSecret
                  ) {
                    url
                  }
                }
              }
            }
          }
        }
      `,
      {
        netlifySiteName,
        netlifyTokenSecret,
      }
    )
    .then((result) => result.host.workdir.read.yarn.netlifyDeploy);
  console.log("\nNetlify deploy URL: " + result.url);
});
