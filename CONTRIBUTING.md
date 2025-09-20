## Contributing Workflow

### Creating a New Branch and Pull Request

0. You must a) have the correct maintainer privileges, or b) contribute by doing a fork of the UUAIS repository.

1. **Create and switch to a new branch:**
   ```bash
   git checkout -b feature/your-feature-name
   # or for bug fixes:
   git checkout -b fix/bug-description
   ```

2. **Make your changes:**
   - Edit the necessary files
   - Test your changes locally using `npm run dev`
   - Ensure your code follows the project's coding standards

3. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Add descriptive commit message"
   ```

4. **Push your branch to GitHub:**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request:**
   - Go to the GitHub repository
   - Click "New Pull Request"
   - Select your branch as the source and `main` as the target
   - Fill out the PR template with:
     - Clear description of changes
     - Screenshots (if applicable)
     - Testing steps
   - Request review from team members

6. **Wait for Review:**
   - Address any feedback from reviewers
   - Make additional commits if needed
   - Once approved, a maintainer will merge your PR

### Branch Naming Conventions

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/documentation-update` - Documentation changes
- `refactor/component-name` - Code refactoring

### Before Submitting a PR

- [ ] Test your changes locally
- [ ] Run `npm run lint` to check for code issues
- [ ] Ensure all new components are properly typed
- [ ] Update documentation if needed
- [ ] Add screenshots for UI changes