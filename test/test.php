<?php

echo "THERE";
?><html>
<head>
	<title>THERE</title>
</head>
<body>
	<form method="POST">
		<input type="text" name="hello" value="POST">
		<input type="submit"?>
	</form>
	<pre><?= var_dump($_POST); ?></pre>
	<pre><?= var_dump($_SERVER); ?></pre>
</body>
</html>