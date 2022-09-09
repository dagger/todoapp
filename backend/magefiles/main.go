//go:build mage

package main

import (
	"context"
	"fmt"
	"os"

	"github.com/dagger/cloak/engine"
	"github.com/dagger/cloak/sdk/go/dagger"
	"github.com/dagger/todoapp/api/magefiles/gen/core"
	"github.com/dagger/todoapp/api/magefiles/gen/todoapp"
)

func Deploy(ctx context.Context) {
	if err := engine.Start(ctx, &engine.Config{}, func(ctx engine.Context) error {
		// User can configure netlify site name with $NETLIFY_SITE_NAME
		siteName, ok := os.LookupEnv("NETLIFY_SITE_NAME")
		if !ok {
			user, _ := os.LookupEnv("USER")
			siteName = fmt.Sprintf("%s-dagger-todoapp", user)
		}
		fmt.Printf("Using Netlify site name %q\n", siteName)

		// User must configure netlify API token with $NETLIFY_AUTH_TOKEN
		tokenCleartext, ok := os.LookupEnv("NETLIFY_AUTH_TOKEN")
		if !ok {
			return fmt.Errorf("NETLIFY_AUTH_TOKEN not set")
		}

		// Load API token into a secret
		var token dagger.SecretID
		if resp, err := core.AddSecret(ctx, tokenCleartext); err != nil {
			return err
		} else {
			token = resp.Core.AddSecret
		}

		// Load source code from workdir
		var source dagger.FSID
		if resp, err := core.Workdir(ctx); err != nil {
			return err
		} else {
			source = resp.Host.Workdir.Read.ID
		}

		// Deploy using the todoapp deploy extension
		resp, err := todoapp.Deploy(ctx, source, siteName, token)
		if err != nil {
			return err
		}

		// Print deployment info to the user
		fmt.Println("URL:", resp.Todoapp.Deploy)

		return nil
	}); err != nil {
		panic(err)
	}
}
