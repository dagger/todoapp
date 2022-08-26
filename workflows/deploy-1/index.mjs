// Build todoapp, the hard way
import { gql, Engine } from "@dagger.io/dagger";

import { NetlifyAPI } from "netlify";

new Engine({
	ConfigPath: process.env.CLOAK_CONFIG
}).run(async (client) => {
	// 1. Load app source code from working directory
	const source = await client.request(gql`
	{
	  host {
	    workdir {
	      read {
	        id
	      }
	    }
	  }
	}
  `).then((result) => result.host.workdir.read)

	// 2. Install yarn in a container
	const image = await client.request(gql`
	{
	  core {
	    image(ref:"index.docker.io/alpine") {
	      exec(input: {
		args:["apk", "add", "yarn"]
	      }) {
		stdout
		fs {
		  exec(input:{args:["apk", "add", "git"]}) {
		    stdout
		    fs {
			  exec(input: {args: ["apk", "add", "openssh"]}) {
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
`).then((result) => result.core.image.exec.fs.exec.fs.exec.fs)

	// 3. Run 'yarn install' in a container
	const sourceAfterInstall = await client.request(gql`
	{
		core {
		  filesystem(id: "${image.id}") {
			exec(
			  input: {
				args: ["yarn", "install"]
				mounts: [{ fs: "${source.id}", path: "/src" }]
				workdir: "/src"
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
	`).then((result) => result.core.filesystem.exec.mount)

	// 4. Run 'yarn run build' in a container
	const sourceAfterBuild = await client.request(gql` 
	{
		core {
		  filesystem(id: "${image.id}") {
			exec(
			  input: {
				args: ["./node_modules/.bin/react-scripts", "build"]
				mounts: [{ fs: "${sourceAfterInstall.id}", path: "/src" }]
				workdir: "/src"
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
	  `).then((result) => result.core.filesystem.exec.mount)

	const netlifyToken = process.env["NETLIFY_AUTH_TOKEN"]
	const netlifyClient = new NetlifyAPI(netlifyToken)
	const netlifySiteName = "sam-test-cloak-deploy-js"

	// 5. grab the netlify site name (create it if it does not exist) from the Netlify API
	var site = await netlifyClient
		.listSites()
		.then((sites) =>
			sites.find(site => site.name === netlifySiteName)
		)

	if (site === undefined) {
		var site = await netlifyClient.createSite({
			body: {
				name: netlifySiteName,
			},
		})
	}

	// 6. Deploy to netlify from a container with the netlify-cli
	const netlifyDeploy = await client.request(gql`
	{
		core {
			image(ref: "index.docker.io/clearbanc/netlify-cli-deploy:4af2fe82fb") {
				exec(input: {
					args: ["netlify", "deploy", "--build", "--site", "${site.id}", "--prod", "--auth", "${netlifyToken}"]
					mounts: [{ fs: "${sourceAfterInstall.id}", path: "/src" }]
					workdir: "/src/build"
				}) {
					stderr
					stdout
				}
			}
		}
	}
	`).then((result) => result.core.image.exec)

	site = await netlifyClient.getSite({ site_id: site.id })

	console.log("Netlify deploy URL: " + site.url)
});
