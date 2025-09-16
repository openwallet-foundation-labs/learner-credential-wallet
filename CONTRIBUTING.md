## How to contribute

You are encouraged to contribute to the repository by **forking and submitting a pull request**.

(If you are new to GitHub, you might start with a [basic tutorial](https://help.github.com/articles/set-up-git) and check out a more detailed guide to [pull requests](https://help.github.com/articles/using-pull-requests/).)

Pull requests will be evaluated by the repository guardians on a schedule and if deemed beneficial will be committed to the main branch. Pull requests should have a descriptive name and include an summary of all changes made in the pull request description.

If you would like to propose a significant change, please open an issue first to discuss the proposed changes with the community and to avoid re-work.

## Contributing checklist:

- If opening a PR, please link it to an existing GitHub issue or create a new one.
- It is difficult to manage a release with too many changes.
  - We should **release more often**, not months apart.
  - We should focus on feature releases (minor and patch releases) to speed iteration.
    - The LCW follows semantic versioning. This means that major version changes (1.0.0) are considered breaking changes. When features are added this is a minor version change (0.1.0). For bug fixes the patch version change is used (0.0.1).
- Per the repository stewards (Open Wallet Foundation), we require that devs sign off on every commit. This can be done on your terminal with an `-s` flag.
- Mixing breaking changes with other PRs slows development.
  - Non-breaking change PRs are merged earlier into **main**
  - Breaking change PRs will go to a branch named **<release-version>-pre (ie. 0.3.0-pre)** and merged later in the release cycle.
  - Consider separating your PR into a (usually larger) non-breaking PR and a (usually smaller) breaking change PR.
- Relevant changes for the changelog must be documented. Please include an update to our CHANGELOG.md and version bump (usually patch or minor) in package.json.