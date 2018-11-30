if ~/npm/bin/nsp check --filter 2; then
	git add .
	npm version patch
	npm publish
	git commit -m "$1"
	git push origin master --tags
else
	echo "Not publishing due to security vulnerabilites"
fi
