//go:build mage

package main

import (
	"context"
	"fmt"
	"os"

	"github.com/Khan/genqlient/graphql"
	"go.dagger.io/dagger/engine"
	"go.dagger.io/dagger/sdk/go/dagger"
)

func Deploy(ctx context.Context) {
	if err := engine.Start(ctx, &engine.Config{}, func(ctx engine.Context) error {
		client, err := dagger.Client(ctx)
		if err != nil {
			return err
		}

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
		token, err := addSecret(ctx, client, tokenCleartext)
		if err != nil {
			return err
		}

		// Deploy using the todoapp deploy extension
		url, err := deploy(ctx, client, ctx.Workdir, siteName, token)
		if err != nil {
			return err
		}

		// Print deployment info to the user
		fmt.Println("URL:", url)

		return nil
	}); err != nil {
		panic(err)
	}
}

func addSecret(ctx context.Context, client graphql.Client, plaintext string) (dagger.SecretID, error) {
	req := &graphql.Request{
		Query: `
query AddSecret ($plaintext: String!) {
	core {
		addSecret(plaintext: $plaintext)
	}
}
`,
		Variables: map[string]any{
			"plaintext": plaintext,
		},
	}
	resp := struct {
		Core struct {
			AddSecret dagger.SecretID
		}
	}{}
	err := client.MakeRequest(ctx, req, &graphql.Response{Data: &resp})
	if err != nil {
		return "", err
	}

	return resp.Core.AddSecret, nil
}

func deploy(ctx context.Context, client graphql.Client, fs dagger.FSID, siteName string, token dagger.SecretID) (string, error) {
	req := &graphql.Request{
		Query: `
query Deploy ($fs: FSID!, $siteName: String!, $token: SecretID!) {
	todoapp {
		deploy(source: $fs, siteName: $siteName, token: $token)
	}
}
`,
		Variables: map[string]any{
			"fs":       fs,
			"siteName": siteName,
			"token":    token,
		},
	}
	resp := struct {
		Todoapp struct {
			Deploy string
		}
	}{}
	err := client.MakeRequest(ctx, req, &graphql.Response{Data: &resp})
	if err != nil {
		return "", err
	}

	return resp.Todoapp.Deploy, nil
}
