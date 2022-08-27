// Build todoapp, the hard way
import { gql, Engine } from "@dagger.io/dagger";

import { NetlifyAPI } from "netlify";

new Engine({
  ConfigPath: process.env.CLOAK_CONFIG,
}).run(async (client) => {
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
    .then((result) => result.host.workdir.read);

  // 2. Install yarn in a container
  const image = await client
    .request(
      gql`
        {
          core {
            image(ref: "index.docker.io/alpine") {
              exec(input: { args: ["apk", "add", "yarn"] }) {
                stdout
                fs {
                  exec(input: { args: ["apk", "add", "git"] }) {
                    stdout
                    fs {
                      exec(input: { args: ["apk", "add", "openssh"] }) {
                        fs {
                          id
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `
    )
    .then((result) => result.core.image.exec.fs.exec.fs.exec.fs);

  // 3. Run 'yarn install' in a container
  const sourceAfterInstall = await client
    .request(
      gql`
	{
		core {
		  filesystem(id: "${image.id}") {
			exec(
			  input: {
				args: ["yarn", "install"]
				mounts: [{ fs: "${source.id}", path: "/src" }]
				workdir: "/src"
        env: {name: "YARN_CACHE_FOLDER", value: "/cache"},
        cacheMounts:{name:"yarn", path:"/cache", sharingMode:"locked"},
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
	`
    )
    .then((result) => result.core.filesystem.exec.mount);

  // 4. Run 'yarn run build' in a container
  const sourceAfterBuild = await client
    .request(
      gql` 
	{
		core {
		  filesystem(id: "${image.id}") {
			exec(
			  input: {
				args: ["yarn", "run", "react-scripts", "build"]
				mounts: [{ fs: "${sourceAfterInstall.id}", path: "/src" }]
				workdir: "/src"
        env: {name: "YARN_CACHE_FOLDER", value: "/cache"},
        cacheMounts:{name:"yarn", path:"/cache", sharingMode:"locked"},
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
	  `
    )
    .then((result) => result.core.filesystem.exec.mount);

  const netlifyToken = process.env["NETLIFY_AUTH_TOKEN"];
  const netlifyClient = new NetlifyAPI(netlifyToken);
  const netlifySiteName = "test-cloak-netlify-deploy";

  // 5. grab the netlify site name (create it if it does not exist) from the Netlify API
  var site = await netlifyClient
    .listSites()
    .then((sites) => sites.find((site) => site.name === netlifySiteName));

  if (site === undefined) {
    var site = await netlifyClient.createSite({
      body: {
        name: netlifySiteName,
      },
    });
  }

  // 6. Setup the netlify token as a secret so it can be securely passed to the next steps
  const tokenSecretID = await client
    .request(
      gql`
        {
          core {
            addSecret(plaintext: "${netlifyToken}")
          }
        }
      `
    )
    .then((result) => result.core.addSecret);

  // 7. Deploy to netlify from a container with the netlify-cli
  // FIXME: the ENV directive on the pulled image is ignored
  // once it's fixed, we can removed the absolute path for the netlify-cli
  const netlifyLink = await client
    .request(
      gql`
	{
		core {
			image(ref: "index.docker.io/samalba/netlify-cli:multi-arch") {
				exec(input: {
					args: ["/netlify/node_modules/.bin/netlify", "link", "--id", "${site.id}"]
					mounts: [{ fs: "${sourceAfterBuild.id}", path: "/src" }]
					workdir: "/src/build"
          secretEnv:{name:"NETLIFY_AUTH_TOKEN", id:"${tokenSecretID}"}
				}) {
					mount(path: "/src") {
            id
          }
				}
			}
		}
	}
	`
    )
    .then((result) => result.core.image.exec.mount);

  const netlifyDeploy = await client
    .request(
      gql`
	{
		core {
			image(ref: "index.docker.io/samalba/netlify-cli:multi-arch") {
				exec(input: {
					args: ["/netlify/node_modules/.bin/netlify", "deploy", "--build", "--site", "${site.id}", "--prod"]
					mounts: [{ fs: "${netlifyLink.id}", path: "/src" }]
					workdir: "/src/build"
          secretEnv:{name:"NETLIFY_AUTH_TOKEN", id:"${tokenSecretID}"}
				}) {
					stderr
					stdout
				}
			}
		}
	}
	`
    )
    .then((result) => result.core.image.exec);

  site = await netlifyClient.getSite({ site_id: site.id });

  console.log("Netlify deploy URL: " + site.url);
});
