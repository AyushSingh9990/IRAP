# Dependency compatibility

The project uses the package versions declared in the root, client, and server manifests. Install dependencies with the standard workspace command:

```bash
npm run install:all
```

Do not use `--force`, `--legacy-peer-deps`, or `npm audit fix --force` as routine installation steps. Breaking upgrades must be reviewed, applied deliberately, and followed by the complete quality pipeline.

Document uploads use Multer memory storage and the official Cloudinary SDK upload stream when Cloudinary is configured. No third-party Multer-to-Cloudinary storage adapter is required.
