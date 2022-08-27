// Build todoapp, the EASY way
import { gql, Engine } from "@dagger.io/dagger";

// Check for netlify token
if (!process.env.NETLIFY_AUTH_TOKEN) {
	console.log("Missing netlify API token. Please set it to the env variable $NETLIFY_AUTH_TOKEN")
	process.exit(1)
}

const netlifySiteName = null
if (process.env.NETLIFY_SITE_NAME) {
	const netlifySiteName = process.env.NETLIFY_SITE_NAME
	console.log(`
		Using netlify site name: "${netlifySiteName}"
	`)
} else {
	const netlifySiteName = `${process.env.USER}-dagger-todoapp`
	console.log(`
		Netlify site name not specified in $NETLIFY_SITE_NAME.
		Defaulting to "${netlifySiteName}".
	`)
}

const netlifyTokenCleartext = process.env.NETLIFY_AUTH_TOKEN

// Start cloak engine
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

	// 2. Build the app with yarn
	const sourceAfterBuild = await client.request(gql`
	{
	  yarn {
		script(source: "${source.id}", runArgs: ["build"]) {
			id
		}
	  }
	}
	`).then((result) => result.yarn.script)

	// 3. Load netlify token into a secret
	const netlifyTokenSecret = await client.request(gql`
	{
		core {
			addSecret(plaintext: "${netlifyTokenCleartext}")
		}
	}
	`).then((result) => result.core.addSecret)

	// 4. deploy to Netlify
	const result = await client.request(gql`
	{
		netlify {
			deploy(
				contents: "${sourceAfterBuild.id}",
				subdir: "build",
				siteName: "${netlifySiteName}",
				token: "${netlifyTokenSecret
			}") {
				url
				deployURL
			}
		}
	}
	`)

	console.log("Netlify deploy URL: " + result.netlify.deploy.url)
});
