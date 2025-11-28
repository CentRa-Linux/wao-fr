{
  description = "playwright-mcp development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        # buildFHSEnvを使用してPlaywrightのブラウザバイナリが動作する環境を構築
        fhsEnv = pkgs.buildFHSEnv {
          name = "playwright-mcp-env";

          targetPkgs = pkgs: with pkgs; [
            # Node.js環境
            nodejs_22
            nodePackages.pnpm

            # Playwrightのブラウザが必要とする依存関係
            glib
            nss
            nspr
            atk
            at-spi2-atk
            cups
            dbus
            libdrm
            gtk3
            pango
            cairo
            xorg.libX11
            xorg.libXcomposite
            xorg.libXdamage
            xorg.libXext
            xorg.libXfixes
            xorg.libXrandr
            mesa
            expat
            alsa-lib

            # 追加の依存関係
            openssl
            glibc
            gcc-unwrapped

            # Chromium用
            chromium
          ];

          multiPkgs = pkgs: with pkgs; [
            # 32bit/64bit両対応のライブラリ
          ];

          runScript = "bash";

          profile = ''
            export SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
            export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
          '';
        };
      in
      {
        devShells.default = fhsEnv.env;

        # 通常のdevShellも提供（FHS環境なしでnpx playwright installが使える場合用）
        devShells.native = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            nodePackages.pnpm
            playwright-driver
          ];

          shellHook = ''
            echo "playwright-mcp development environment (native)"
            echo "Node.js version: $(node --version)"
            echo "pnpm version: $(pnpm --version)"
            echo ""
            echo "Note: If you encounter browser issues, use 'nix develop' (FHS environment)"
          '';
        };
      }
    );
}
