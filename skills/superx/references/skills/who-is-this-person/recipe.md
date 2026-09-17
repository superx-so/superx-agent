# Who Is This Person?

A fast read on a public account, plus the history the SuperX account already has with them.

```bash
superx x:user <handle>
superx x:user-posts <handle> --no-reposts --limit 20
superx contacts:get <x-user-id>
superx contacts:replies <x-user-id> --sort recent --limit 5
```

`contacts:get` covers known contacts only: engagers, contact-list members and scored leads. A 404 there means the person is not one of them yet, not that the lookup failed.

MCP: `lookup_x_user` -> `get_x_user_posts` -> `get_contact` -> `get_contact_history`

Stops at: the profile read in chat. Reads only, on the shared 300-a-day `x:*` allowance.
