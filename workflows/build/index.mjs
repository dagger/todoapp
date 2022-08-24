// Build todoapp, the hard way
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
		      id
		    }
		  }
		}
	      }
	    }
	  }
	}
`).then((result) => result.core.image.exec.fs.exec.fs)

  // 3. Run 'yarn install' in a container

  // 4. Run 'yarn run build' in a container

  // 5. write the result back to workdir
});
