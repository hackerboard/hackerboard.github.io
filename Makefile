.PHONY: build serve clean

build:
	node build.js

serve: build
	@echo "→ http://localhost:8085"
	python3 -m http.server 8085

clean:
	rm -f index.html signal.html feed.xml feed.json
	rm -rf archive/