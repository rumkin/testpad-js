testpad.js
=======

Testpad is a test stand written as nodejs module. It created for web developers and should replace local servers like apache or nginx. Testpad allow to get control over environment and use multiple of js libraries like LESS. Modules called workers could compile LESS, run php-cgi scripts, route wildcard domains and do other usefull stuff out of the box.

about
-----

Testpad uses modules, called `workers` to process over request. Default workers is:

* `multi` resolve host name to wildcard domain path using specified fs layout
* `customizer` allow to call custom js worker to control over host request
* `cgi` executes cgi scripts
* `static` output static content
* `less` compile less into css
* `error` report about errors to browser with plain-text



license
-------

PUBLISHED UNDER GPL V3 LICENSE
© 2013, Rumkin