// Build todoapp, the hard way
import { gql, Engine } from "@dagger.io/dagger";
import { NetlifyAPI } from "netlify";

const engine = new Engine({ ConfigPath: process.env.CLOAK_CONFIG });

engine.run(async (client) => {
  // 1. Load app source code from working directory
  const source = await client
    .request(
      gql`
        {
          host {
            workdir {
              read {
                id
              }
            }
          }
        }
      `
    )
    .then((result) => result.host.workdir.read.id);

  // 2. Install yarn in a container
  const image = await client
    .request(
      gql`
        {
          core {
            image(ref: "index.docker.io/alpine") {
              exec(input: { args: ["apk", "add", "yarn", "git", "openssh"] }) {
                fs {
                  id
                }
              }
            }
          }
        }
      `
    )
    .then((result) => result.core.image.exec.fs.id);

  // 3. Run 'yarn install' in a container
  const sourceAfterInstall = await client
    .request(
      gql`
        query ($image: FSID!, $source: FSID!) {
          core {
            filesystem(id: $image) {
              exec(
                input: {
                  args: ["yarn", "install"]
                  mounts: [{ fs: $source, path: "/src" }]
                  workdir: "/src"
                  env: [
                    { name: "YARN_CACHE_FOLDER", value: "/cache" }
                    {
                      name: "GIT_SSH_COMMAND"
                      value: "ssh -o StrictHostKeyChecking=no"
                    }
                  ]
                  cacheMounts: {
                    name: "yarn"
                    path: "/cache"
                    sharingMode: "locked"
                  }
                  sshAuthSock: "/ssh-agent"
                }
              ) {
                # Retrieve modified source
                mount(path: "/src") {
                  id
                }
              }
            }
          }
        }
      `,
      {
        image,
        source,
      }
    )
    .then((result) => result.core.filesystem.exec.mount.id);

  // 4. Run 'yarn run build' in a container
  const sourceAfterBuild = await client
    .request(
      gql`
        query ($image: FSID!, $sourceAfterInstall: FSID!) {
          core {
            filesystem(id: $image) {
              exec(
                input: {
                  args: ["yarn", "run", "react-scripts", "build"]
                  mounts: [{ fs: $sourceAfterInstall, path: "/src" }]
                  workdir: "/src"
                  env: [
                    { name: "YARN_CACHE_FOLDER", value: "/cache" }
                    {
                      name: "GIT_SSH_COMMAND"
                      value: "ssh -o StrictHostKeyChecking=no"
                    }
                  ]
                  cacheMounts: {
                    name: "yarn"
                    path: "/cache"
                    sharingMode: "locked"
                  }
                  sshAuthSock: "/ssh-agent"
                }
              ) {
                # Retrieve modified source
                mount(path: "/src") {
                  id
                }
              }
            }
          }
        }
      `,
      {
        image,
        sourceAfterInstall,
      }
    )
    .then((result) => result.core.filesystem.exec.mount.id);

  const netlifyToken = process.env["NETLIFY_AUTH_TOKEN"];
  const netlifyClient = new NetlifyAPI(netlifyToken);
  const netlifySiteName =
    process.env.NETLIFY_SITE_NAME ?? `${process.env.USER}-dagger-todoapp`;

  // 5. grab the netlify site name (create it if it does not exist) from the Netlify API
  var site = await netlifyClient
    .listSites()
    .then((sites) => sites.find((site) => site.name === netlifySiteName));

  if (site === undefined) {
    site = await netlifyClient.createSite({
      body: {
        name: netlifySiteName,
      },
    });
  }

  // 6. Setup the netlify token as a secret so it can be securely passed to the next steps
  const tokenSecretId = await client
    .request(
      gql`
        query ($netlifyToken: String!) {
          core {
            addSecret(plaintext: $netlifyToken)
          }
        }
      `,
      {
        netlifyToken,
      }
    )
    .then((result) => result.core.addSecret);

  // 7. Deploy to netlify from a container with the netlify-cli
  await client.request(
    gql`
      query (
        $sourceAfterBuild: FSID!
        $siteId: String!
        $tokenSecretId: SecretID!
      ) {
        core {
          image(ref: "index.docker.io/samalba/netlify-cli:multi-arch") {
            exec(
              input: {
                args: [
                  "/netlify/node_modules/.bin/netlify"
                  "deploy"
                  "--dir=."
                  "--build"
                  "--site"
                  $siteId
                  "--prod"
                ]
                mounts: [{ fs: $sourceAfterBuild, path: "/src" }]
                workdir: "/src/build"
                secretEnv: { name: "NETLIFY_AUTH_TOKEN", id: $tokenSecretId }
              }
            ) {
              stderr
              stdout
            }
          }
        }
      }
    `,
    {
      sourceAfterBuild,
      siteId: site.id,
      tokenSecretId,
    }
  );

  site = await netlifyClient.getSite({ site_id: site.id });

  console.log("Netlify deploy URL: " + site.url);
});
