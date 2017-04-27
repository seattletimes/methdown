Methdown
========

Methdown is a simple script for parsing the XML files output by Eidos Méthode and converting them to Markdown, including links, headlines, and subheads (other features not supported). 

Install Methdown globally from this repo with `npm install seattletimes/methdown -g`. By default, it reads from stdin and stdout, but you probably want to use the flags for input and output files:

```
methdown -i input_file.xml -o output_file.xml
```

The goal of Methdown is to make it easier to treat Méthode as the source of truth in a web-based workflow, such as the [Seattle Times news app template](https://github.com/seattletimes/newsapp-template).