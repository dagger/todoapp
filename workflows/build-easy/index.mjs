// Build todoapp, the EASY way
import { gql, Engine } from "@dagger.io/dagger";

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
	const sourceAfterBuild = await client.request(gql`
	{
	  yarn {
		script(source: "${source.id}", runArgs: ["react-scripts", "build"]) {
			id
		}
	  }
	}
	`).then((result) => result.yarn.script)


	// 3. write the result back to workdir
	const result = await client.request(gql`
	{
		host {
			workdir {
				write(contents: "${sourceAfterBuild.id}")
			}
		}
	}
	`)
});
